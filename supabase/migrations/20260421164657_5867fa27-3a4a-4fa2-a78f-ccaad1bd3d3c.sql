-- ERP outbox for Oracle ERP Cloud delegation/approval events
CREATE TABLE IF NOT EXISTS public.erp_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_system TEXT NOT NULL DEFAULT 'oracle_erp_cloud',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pushed_at TIMESTAMPTZ,
  response_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS erp_outbox_org_status_idx ON public.erp_outbox (organization_id, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS erp_outbox_entity_idx ON public.erp_outbox (entity_type, entity_id);

ALTER TABLE public.erp_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can view erp_outbox" ON public.erp_outbox;
CREATE POLICY "Org admins can view erp_outbox" ON public.erp_outbox
FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (
    public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
  )
);

DROP POLICY IF EXISTS "Org admins can insert erp_outbox" ON public.erp_outbox;
CREATE POLICY "Org admins can insert erp_outbox" ON public.erp_outbox
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND (
    public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Org admins can update erp_outbox" ON public.erp_outbox;
CREATE POLICY "Org admins can update erp_outbox" ON public.erp_outbox
FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (
    public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE OR REPLACE FUNCTION public.update_erp_outbox_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_outbox_updated_at ON public.erp_outbox;
CREATE TRIGGER trg_erp_outbox_updated_at
BEFORE UPDATE ON public.erp_outbox
FOR EACH ROW EXECUTE FUNCTION public.update_erp_outbox_updated_at();

-- Auto-enqueue events when a delegation is created/changed/revoked
CREATE OR REPLACE FUNCTION public.enqueue_erp_delegation_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  -- Only push meaningful actions; skip system noise
  IF NEW.action IS NULL OR NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_type := lower(NEW.action);
  IF v_event_type NOT IN ('create','update','delete','activate','deactivate','approve','reject','delegate','revoke') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.erp_outbox (
    organization_id, entity_type, entity_id, event_type, payload, target_system, status
  ) VALUES (
    NEW.organization_id,
    COALESCE(NEW.source_table, 'delegation'),
    NEW.source_id,
    v_event_type,
    jsonb_build_object(
      'audit_id', NEW.id,
      'actor_id', NEW.actor_id,
      'actor_name', NEW.actor_name,
      'entity_name', NEW.entity_name,
      'scope', NEW.scope,
      'summary', NEW.summary,
      'old_values', NEW.old_values,
      'new_values', NEW.new_values,
      'occurred_at', NEW.created_at
    ),
    'oracle_erp_cloud',
    'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_erp_delegation_event ON public.delegation_audit_log;
CREATE TRIGGER trg_enqueue_erp_delegation_event
AFTER INSERT ON public.delegation_audit_log
FOR EACH ROW EXECUTE FUNCTION public.enqueue_erp_delegation_event();