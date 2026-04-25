-- 1. Add OLA columns
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS operation_type text,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_breached_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_released_by uuid,
  ADD COLUMN IF NOT EXISTS extension_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS extension_until timestamptz,
  ADD COLUMN IF NOT EXISTS extension_reason text;

UPDATE public.vehicle_requests
SET operation_type = CASE
  WHEN request_type IN ('daily_operation','nighttime_operation','routine','trip') THEN 'daily_operation'
  WHEN request_type = 'field_operation' THEN 'field_work'
  WHEN request_type = 'project_operation' THEN 'project_work'
  ELSE 'daily_operation'
END
WHERE operation_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_vr_sla_due ON public.vehicle_requests(sla_due_at) WHERE sla_breached = false AND assigned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vr_no_show_due ON public.vehicle_requests(no_show_due_at) WHERE no_show_released_at IS NULL AND check_in_at IS NULL;

-- 2. SLA minutes helper
CREATE OR REPLACE FUNCTION public.ola_sla_minutes(p_operation_type text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_operation_type
    WHEN 'incident_urgent' THEN 10
    WHEN 'daily_operation' THEN 30
    WHEN 'field_work'      THEN 60 * 36
    WHEN 'project_work'    THEN 60 * 24 * 30
    ELSE 30
  END
$$;

-- 3. Trigger
CREATE OR REPLACE FUNCTION public.set_vr_ola_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_minutes int;
BEGIN
  IF NEW.operation_type IS NULL THEN
    NEW.operation_type := COALESCE(OLD.operation_type, 'daily_operation');
  END IF;
  v_minutes := public.ola_sla_minutes(NEW.operation_type);
  NEW.kpi_target_minutes := v_minutes;
  IF NEW.sla_due_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.operation_type IS DISTINCT FROM NEW.operation_type) THEN
    NEW.sla_due_at := COALESCE(NEW.created_at, now()) + make_interval(mins => v_minutes);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_at IS NOT NULL AND OLD.assigned_at IS NULL THEN
    NEW.actual_assignment_minutes := GREATEST(0,
      EXTRACT(EPOCH FROM (NEW.assigned_at - NEW.created_at))::int / 60);
    IF NEW.assigned_at > NEW.sla_due_at AND NOT NEW.sla_breached THEN
      NEW.sla_breached := true;
      NEW.sla_breached_at := NEW.assigned_at;
    END IF;
    NEW.no_show_due_at := NEW.assigned_at + interval '1 hour';
  END IF;
  IF NEW.check_in_at IS NOT NULL OR NEW.driver_checked_in_at IS NOT NULL THEN
    NEW.no_show_due_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vr_ola_fields ON public.vehicle_requests;
CREATE TRIGGER trg_vr_ola_fields
  BEFORE INSERT OR UPDATE OF operation_type, assigned_at, check_in_at, driver_checked_in_at, sla_due_at
  ON public.vehicle_requests FOR EACH ROW EXECUTE FUNCTION public.set_vr_ola_fields();

-- 4. Extensions
CREATE TABLE IF NOT EXISTS public.vehicle_request_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  requested_until timestamptz NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_request_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ext_select_org" ON public.vehicle_request_extensions FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "ext_insert_self" ON public.vehicle_request_extensions FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid()
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "ext_update_managers" ON public.vehicle_request_extensions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
  );
CREATE INDEX IF NOT EXISTS idx_vre_request ON public.vehicle_request_extensions(request_id);

-- 5. Escalations
CREATE TABLE IF NOT EXISTS public.ola_breach_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  raised_by uuid NOT NULL,
  reason text NOT NULL,
  root_cause text,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  escalated_to_cxqmd_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ola_breach_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obe_select_org" ON public.ola_breach_escalations FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "obe_insert_managers" ON public.ola_breach_escalations FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND raised_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
    )
  );
CREATE POLICY "obe_update_managers" ON public.ola_breach_escalations FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
  );
CREATE INDEX IF NOT EXISTS idx_obe_status ON public.ola_breach_escalations(status, organization_id);

CREATE OR REPLACE FUNCTION public.touch_obe_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_obe_updated ON public.ola_breach_escalations;
CREATE TRIGGER trg_obe_updated BEFORE UPDATE ON public.ola_breach_escalations
  FOR EACH ROW EXECUTE FUNCTION public.touch_obe_updated_at();

-- 6. Compliance RPC
CREATE OR REPLACE FUNCTION public.compute_ola_compliance(
  p_org_id uuid, p_start timestamptz, p_end timestamptz, p_group_by text DEFAULT 'operation_type'
)
RETURNS TABLE(
  bucket text, total bigint, on_time bigint, breached bigint,
  compliance_pct numeric, avg_assignment_minutes numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE p_group_by
      WHEN 'pool_name' THEN COALESCE(vr.pool_name, '—')
      WHEN 'division'  THEN COALESCE(vr.pool_category, '—')
      ELSE COALESCE(vr.operation_type, 'daily_operation')
    END AS bucket,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE vr.sla_breached = false AND vr.assigned_at IS NOT NULL)::bigint,
    COUNT(*) FILTER (WHERE vr.sla_breached = true)::bigint,
    ROUND(100.0 * COUNT(*) FILTER (WHERE vr.sla_breached = false AND vr.assigned_at IS NOT NULL)
      / NULLIF(COUNT(*) FILTER (WHERE vr.assigned_at IS NOT NULL), 0), 1),
    ROUND(AVG(vr.actual_assignment_minutes) FILTER (WHERE vr.actual_assignment_minutes IS NOT NULL), 1)
  FROM public.vehicle_requests vr
  WHERE vr.organization_id = p_org_id
    AND vr.created_at >= p_start AND vr.created_at < p_end
    AND vr.deleted_at IS NULL
  GROUP BY 1 ORDER BY 1;
END
$$;
REVOKE ALL ON FUNCTION public.compute_ola_compliance FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_ola_compliance TO authenticated;