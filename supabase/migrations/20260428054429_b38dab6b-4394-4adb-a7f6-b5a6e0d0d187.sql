-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.dispatch_job_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  job_number text,
  event_type text NOT NULL,           -- 'created' | 'status_changed' | 'vehicle_assigned' | 'driver_assigned' | 'unassigned' | 'updated'
  from_value text,
  to_value text,
  changed_fields text[],
  actor_id uuid,                      -- auth.uid() at time of change
  actor_role text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dja_log_job ON public.dispatch_job_audit_log(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dja_log_org ON public.dispatch_job_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dja_log_event ON public.dispatch_job_audit_log(event_type);

ALTER TABLE public.dispatch_job_audit_log ENABLE ROW LEVEL SECURITY;

-- Read policy: same-org users with operations / audit roles
DROP POLICY IF EXISTS "dja_log_read_authorized" ON public.dispatch_job_audit_log;
CREATE POLICY "dja_log_read_authorized"
ON public.dispatch_job_audit_log
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
    OR public.has_role(auth.uid(), 'dispatcher'::app_role)
    OR public.has_role(auth.uid(), 'auditor'::app_role)
  )
);

-- Deny direct writes from the app: only the SECURITY DEFINER trigger may write
-- (no INSERT/UPDATE/DELETE policies = blocked under RLS)

-- 2) Trigger function
CREATE OR REPLACE FUNCTION public.log_dispatch_job_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_changed text[] := ARRAY[]::text[];
BEGIN
  -- best-effort: pick a primary role for the actor (NULL if none / system)
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role
    FROM public.user_roles
    WHERE user_id = v_actor
    ORDER BY CASE role::text
      WHEN 'super_admin' THEN 1
      WHEN 'org_admin' THEN 2
      WHEN 'fleet_owner' THEN 3
      WHEN 'operations_manager' THEN 4
      WHEN 'dispatcher' THEN 5
      WHEN 'auditor' THEN 6
      ELSE 9
    END
    LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dispatch_job_audit_log(
      organization_id, job_id, job_number, event_type,
      from_value, to_value, actor_id, actor_role, metadata
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.job_number, 'created',
      NULL, NEW.status, v_actor, v_role,
      jsonb_build_object(
        'priority', NEW.priority,
        'job_type', NEW.job_type,
        'vehicle_id', NEW.vehicle_id,
        'driver_id', NEW.driver_id
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE: emit one row per meaningful change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changed := array_append(v_changed, 'status');
    INSERT INTO public.dispatch_job_audit_log(
      organization_id, job_id, job_number, event_type,
      from_value, to_value, actor_id, actor_role, metadata
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.job_number, 'status_changed',
      OLD.status, NEW.status, v_actor, v_role,
      jsonb_build_object(
        'dispatched_at', NEW.dispatched_at,
        'completed_at', NEW.completed_at,
        'actual_pickup_at', NEW.actual_pickup_at,
        'actual_dropoff_at', NEW.actual_dropoff_at
      )
    );
  END IF;

  IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    v_changed := array_append(v_changed, 'vehicle_id');
    INSERT INTO public.dispatch_job_audit_log(
      organization_id, job_id, job_number, event_type,
      from_value, to_value, actor_id, actor_role, metadata
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.job_number,
      CASE WHEN NEW.vehicle_id IS NULL THEN 'unassigned' ELSE 'vehicle_assigned' END,
      OLD.vehicle_id::text, NEW.vehicle_id::text, v_actor, v_role,
      jsonb_build_object('field','vehicle_id')
    );
  END IF;

  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
    v_changed := array_append(v_changed, 'driver_id');
    INSERT INTO public.dispatch_job_audit_log(
      organization_id, job_id, job_number, event_type,
      from_value, to_value, actor_id, actor_role, metadata
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.job_number,
      CASE WHEN NEW.driver_id IS NULL THEN 'unassigned' ELSE 'driver_assigned' END,
      OLD.driver_id::text, NEW.driver_id::text, v_actor, v_role,
      jsonb_build_object('field','driver_id')
    );
  END IF;

  -- catch-all for other notable edits (priority, scheduled times, sla)
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN v_changed := array_append(v_changed,'priority'); END IF;
  IF NEW.scheduled_pickup_at IS DISTINCT FROM OLD.scheduled_pickup_at THEN v_changed := array_append(v_changed,'scheduled_pickup_at'); END IF;
  IF NEW.scheduled_dropoff_at IS DISTINCT FROM OLD.scheduled_dropoff_at THEN v_changed := array_append(v_changed,'scheduled_dropoff_at'); END IF;
  IF NEW.sla_deadline_at IS DISTINCT FROM OLD.sla_deadline_at THEN v_changed := array_append(v_changed,'sla_deadline_at'); END IF;

  IF array_length(v_changed,1) IS NOT NULL
     AND NOT (v_changed <@ ARRAY['status','vehicle_id','driver_id']) THEN
    INSERT INTO public.dispatch_job_audit_log(
      organization_id, job_id, job_number, event_type,
      from_value, to_value, changed_fields, actor_id, actor_role, metadata
    ) VALUES (
      NEW.organization_id, NEW.id, NEW.job_number, 'updated',
      NULL, NULL, v_changed, v_actor, v_role,
      jsonb_build_object(
        'priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority),
        'scheduled_pickup_at', jsonb_build_object('old', OLD.scheduled_pickup_at, 'new', NEW.scheduled_pickup_at),
        'scheduled_dropoff_at', jsonb_build_object('old', OLD.scheduled_dropoff_at, 'new', NEW.scheduled_dropoff_at),
        'sla_deadline_at', jsonb_build_object('old', OLD.sla_deadline_at, 'new', NEW.sla_deadline_at)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_dispatch_job_change ON public.dispatch_jobs;
CREATE TRIGGER trg_log_dispatch_job_change
AFTER INSERT OR UPDATE ON public.dispatch_jobs
FOR EACH ROW EXECUTE FUNCTION public.log_dispatch_job_change();

REVOKE ALL ON FUNCTION public.log_dispatch_job_change() FROM PUBLIC, anon, authenticated;