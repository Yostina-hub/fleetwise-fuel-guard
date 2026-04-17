CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  title TEXT,
  description TEXT,
  current_stage TEXT NOT NULL,
  current_lane TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  priority TEXT DEFAULT 'normal',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}'::jsonb,
  documents TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, workflow_type, reference_number)
);
CREATE INDEX IF NOT EXISTS idx_wf_instances_org_type ON public.workflow_instances (organization_id, workflow_type);
CREATE INDEX IF NOT EXISTS idx_wf_instances_status   ON public.workflow_instances (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_instances_stage    ON public.workflow_instances (organization_id, workflow_type, current_stage);
CREATE INDEX IF NOT EXISTS idx_wf_instances_vehicle  ON public.workflow_instances (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_driver   ON public.workflow_instances (driver_id);

CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  from_lane TEXT,
  to_lane TEXT,
  decision TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  documents TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_instance ON public.workflow_transitions (instance_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wf_transitions_type     ON public.workflow_transitions (organization_id, workflow_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_workflow_instance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_workflow_instance ON public.workflow_instances;
CREATE TRIGGER trg_touch_workflow_instance BEFORE UPDATE ON public.workflow_instances
FOR EACH ROW EXECUTE FUNCTION public.touch_workflow_instance_updated_at();

ALTER TABLE public.workflow_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wf_instances_select_own_org"  ON public.workflow_instances;
DROP POLICY IF EXISTS "wf_instances_insert_own_org"  ON public.workflow_instances;
DROP POLICY IF EXISTS "wf_instances_update_own_org"  ON public.workflow_instances;
DROP POLICY IF EXISTS "wf_instances_delete_managers" ON public.workflow_instances;

CREATE POLICY "wf_instances_select_own_org" ON public.workflow_instances FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wf_instances_insert_own_org" ON public.workflow_instances FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "wf_instances_update_own_org" ON public.workflow_instances FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wf_instances_delete_managers" ON public.workflow_instances FOR DELETE TO authenticated
USING (
  (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
  )
);

DROP POLICY IF EXISTS "wf_trans_select_own_org" ON public.workflow_transitions;
DROP POLICY IF EXISTS "wf_trans_insert_own_org" ON public.workflow_transitions;

CREATE POLICY "wf_trans_select_own_org" ON public.workflow_transitions FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wf_trans_insert_own_org" ON public.workflow_transitions FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_workflow_reference(
  _org_id UUID,
  _workflow_type TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix TEXT; v_seq INT;
BEGIN
  v_prefix := upper(substr(regexp_replace(_workflow_type, '[^a-zA-Z]', '', 'g'), 1, 4));
  IF v_prefix IS NULL OR length(v_prefix) = 0 THEN v_prefix := 'WF'; END IF;
  SELECT COUNT(*) + 1 INTO v_seq FROM public.workflow_instances
  WHERE organization_id = _org_id AND workflow_type = _workflow_type;
  RETURN v_prefix || '-' || to_char(now(), 'YYYYMM') || '-' || lpad(v_seq::text, 5, '0');
END $$;

REVOKE ALL ON FUNCTION public.generate_workflow_reference(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_workflow_reference(UUID, TEXT) TO authenticated;