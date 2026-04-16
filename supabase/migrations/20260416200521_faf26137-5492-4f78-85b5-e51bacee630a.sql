
-- Preventive Maintenance Auto-Trigger Infrastructure

-- 1. Add columns to track auto-trigger metadata on maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS auto_trigger_reason text,
  ADD COLUMN IF NOT EXISTS auto_trigger_threshold_type text, -- 'odometer' | 'engine_hours' | 'date'
  ADD COLUMN IF NOT EXISTS auto_trigger_threshold_value numeric,
  ADD COLUMN IF NOT EXISTS auto_trigger_actual_value numeric,
  ADD COLUMN IF NOT EXISTS auto_triggered_at timestamp with time zone;

-- 2. Function: list schedules currently due for a vehicle / org
CREATE OR REPLACE FUNCTION public.get_due_preventive_schedules(
  p_organization_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_lookahead_days integer DEFAULT 7,
  p_lookahead_km numeric DEFAULT 500,
  p_lookahead_hours numeric DEFAULT 25
)
RETURNS TABLE(
  schedule_id uuid,
  vehicle_id uuid,
  plate_number text,
  service_type text,
  interval_type text,
  next_due_date timestamp with time zone,
  next_due_odometer numeric,
  next_due_hours numeric,
  current_odometer numeric,
  current_hours numeric,
  due_reason text,
  is_overdue boolean,
  priority text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_tel AS (
    SELECT DISTINCT ON (vt.vehicle_id)
      vt.vehicle_id,
      vt.odometer_km,
      vt.engine_hours
    FROM public.vehicle_telemetry vt
    ORDER BY vt.vehicle_id, vt.last_communication_at DESC NULLS LAST
  )
  SELECT
    ms.id AS schedule_id,
    ms.vehicle_id,
    v.plate_number,
    ms.service_type,
    ms.interval_type,
    ms.next_due_date,
    ms.next_due_odometer,
    ms.next_due_hours,
    COALESCE(lt.odometer_km, 0) AS current_odometer,
    COALESCE(lt.engine_hours, v.engine_hours, 0) AS current_hours,
    CASE
      WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date <= now()
        THEN 'date_overdue'
      WHEN ms.next_due_date IS NOT NULL AND ms.next_due_date <= now() + (p_lookahead_days || ' days')::interval
        THEN 'date_upcoming'
      WHEN ms.next_due_odometer IS NOT NULL AND COALESCE(lt.odometer_km, 0) >= ms.next_due_odometer
        THEN 'odometer_overdue'
      WHEN ms.next_due_odometer IS NOT NULL AND COALESCE(lt.odometer_km, 0) >= ms.next_due_odometer - p_lookahead_km
        THEN 'odometer_upcoming'
      WHEN ms.next_due_hours IS NOT NULL AND COALESCE(lt.engine_hours, v.engine_hours, 0) >= ms.next_due_hours
        THEN 'hours_overdue'
      WHEN ms.next_due_hours IS NOT NULL AND COALESCE(lt.engine_hours, v.engine_hours, 0) >= ms.next_due_hours - p_lookahead_hours
        THEN 'hours_upcoming'
      ELSE NULL
    END AS due_reason,
    (
      (ms.next_due_date IS NOT NULL AND ms.next_due_date <= now())
      OR (ms.next_due_odometer IS NOT NULL AND COALESCE(lt.odometer_km, 0) >= ms.next_due_odometer)
      OR (ms.next_due_hours IS NOT NULL AND COALESCE(lt.engine_hours, v.engine_hours, 0) >= ms.next_due_hours)
    ) AS is_overdue,
    COALESCE(ms.priority, 'medium') AS priority
  FROM public.maintenance_schedules ms
  JOIN public.vehicles v ON v.id = ms.vehicle_id
  LEFT JOIN latest_tel lt ON lt.vehicle_id = ms.vehicle_id
  WHERE ms.organization_id = p_organization_id
    AND ms.is_active = true
    AND (p_vehicle_id IS NULL OR ms.vehicle_id = p_vehicle_id)
    AND (
      (ms.next_due_date IS NOT NULL AND ms.next_due_date <= now() + (p_lookahead_days || ' days')::interval)
      OR (ms.next_due_odometer IS NOT NULL AND COALESCE(lt.odometer_km, 0) >= ms.next_due_odometer - p_lookahead_km)
      OR (ms.next_due_hours IS NOT NULL AND COALESCE(lt.engine_hours, v.engine_hours, 0) >= ms.next_due_hours - p_lookahead_hours)
    )
    -- Skip if there's already an open auto-triggered request for this schedule
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.schedule_id = ms.id
        AND mr.status NOT IN ('completed', 'rejected', 'cancelled')
    )
  ORDER BY is_overdue DESC, ms.next_due_date NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_due_preventive_schedules(uuid, uuid, integer, numeric, numeric) TO authenticated;

-- 3. RPC to auto-trigger preventive maintenance requests for one org (or all)
CREATE OR REPLACE FUNCTION public.trigger_preventive_maintenance(
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE(
  organization_id uuid,
  schedule_id uuid,
  request_id uuid,
  vehicle_id uuid,
  plate_number text,
  reason text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due RECORD;
  v_org RECORD;
  v_request_id uuid;
  v_request_number text;
  v_fleet_user uuid;
  v_threshold_type text;
  v_threshold_value numeric;
  v_actual_value numeric;
  v_priority text;
BEGIN
  -- Loop through orgs that need processing
  FOR v_org IN
    SELECT DISTINCT o.id
    FROM public.organizations o
    WHERE p_organization_id IS NULL OR o.id = p_organization_id
  LOOP
    -- Resolve a fleet ops user to act as the requester (system fallback)
    SELECT ur.user_id INTO v_fleet_user
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org.id
      AND ur.role::text IN ('operations_manager', 'fleet_manager', 'super_admin', 'maintenance_lead')
    ORDER BY CASE ur.role::text
      WHEN 'operations_manager' THEN 1
      WHEN 'fleet_manager' THEN 2
      WHEN 'maintenance_lead' THEN 3
      ELSE 4
    END
    LIMIT 1;

    -- Skip orgs without a responsible user
    IF v_fleet_user IS NULL THEN CONTINUE; END IF;

    -- Iterate due schedules that are OVERDUE only (auto-create only when threshold crossed)
    FOR v_due IN
      SELECT * FROM public.get_due_preventive_schedules(v_org.id, NULL, 0, 0, 0)
      WHERE is_overdue = true AND due_reason IS NOT NULL
    LOOP
      -- Determine which threshold triggered
      IF v_due.due_reason LIKE 'date%' THEN
        v_threshold_type := 'date';
        v_threshold_value := EXTRACT(EPOCH FROM v_due.next_due_date);
        v_actual_value := EXTRACT(EPOCH FROM now());
        v_priority := 'high';
      ELSIF v_due.due_reason LIKE 'odometer%' THEN
        v_threshold_type := 'odometer';
        v_threshold_value := v_due.next_due_odometer;
        v_actual_value := v_due.current_odometer;
        v_priority := 'high';
      ELSE
        v_threshold_type := 'engine_hours';
        v_threshold_value := v_due.next_due_hours;
        v_actual_value := v_due.current_hours;
        v_priority := 'medium';
      END IF;

      v_request_number := 'MR-AUTO-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 6);

      INSERT INTO public.maintenance_requests (
        organization_id,
        vehicle_id,
        requested_by,
        request_number,
        request_type,
        trigger_source,
        km_reading,
        running_hours,
        priority,
        status,
        workflow_stage,
        description,
        notes,
        schedule_id,
        auto_trigger_reason,
        auto_trigger_threshold_type,
        auto_trigger_threshold_value,
        auto_trigger_actual_value,
        auto_triggered_at,
        requested_completion_date
      ) VALUES (
        v_org.id,
        v_due.vehicle_id,
        v_fleet_user,
        v_request_number,
        'preventive',
        'auto',
        v_due.current_odometer,
        v_due.current_hours,
        v_priority,
        'submitted',
        'under_review',
        format('Auto-triggered preventive maintenance: %s (%s threshold reached on %s)',
               v_due.service_type, v_threshold_type, v_due.plate_number),
        format('System detected %s threshold crossed. Schedule: %s. Threshold: %s, Actual: %s',
               v_threshold_type, v_due.service_type, v_threshold_value, v_actual_value),
        v_due.schedule_id,
        v_due.due_reason,
        v_threshold_type,
        v_threshold_value,
        v_actual_value,
        now(),
        (CURRENT_DATE + interval '7 days')::date
      ) RETURNING id INTO v_request_id;

      organization_id := v_org.id;
      schedule_id := v_due.schedule_id;
      request_id := v_request_id;
      vehicle_id := v_due.vehicle_id;
      plate_number := v_due.plate_number;
      reason := v_due.due_reason;
      status := 'created';
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_preventive_maintenance(uuid) TO authenticated, service_role;

-- 4. Allow drivers/fleet ops to manually create from a schedule via the existing maintenance_requests insert path
-- (existing RLS already permits insert by authenticated org members)

-- 5. Index to speed up open-request lookup per schedule
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_schedule_open
  ON public.maintenance_requests (schedule_id)
  WHERE status NOT IN ('completed', 'rejected', 'cancelled');
