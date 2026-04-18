-- ============================================================
-- Sync function: fuel_requests → workflow_instances/transitions
-- Mirrors sync_vehicle_request_workflow architecture
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_fuel_request_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_instance_id uuid;
  v_creator uuid;
  v_assignee uuid;
  v_from_status text;
  v_to_status text;
BEGIN
  SELECT id INTO v_creator FROM auth.users WHERE id = NEW.requested_by;
  SELECT id INTO v_assignee FROM auth.users WHERE id = NEW.approved_by;

  v_to_status := COALESCE(NEW.status, 'pending');
  v_from_status := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.status, 'pending') ELSE NULL END;

  -- Find existing workflow instance (by reference_number + type + org)
  SELECT id INTO v_instance_id
    FROM workflow_instances
   WHERE workflow_type = 'fuel_request'
     AND reference_number = NEW.request_number
     AND organization_id = NEW.organization_id
   LIMIT 1;

  IF v_instance_id IS NULL THEN
    INSERT INTO workflow_instances (
      organization_id, workflow_type, reference_number, title,
      current_stage, status, vehicle_id, driver_id, created_by, assigned_to, data
    ) VALUES (
      NEW.organization_id, 'fuel_request', NEW.request_number,
      format('Fuel Request %s', NEW.request_number),
      v_to_status, v_to_status, NEW.vehicle_id, NEW.driver_id,
      v_creator, v_assignee,
      jsonb_build_object(
        'fuel_request_id', NEW.id,
        'request_type', NEW.request_type,
        'fuel_type', NEW.fuel_type,
        'liters_requested', NEW.liters_requested,
        'estimated_cost', NEW.estimated_cost,
        'station_id', NEW.station_id,
        'generator_id', NEW.generator_id,
        'cost_center', NEW.cost_center,
        'purpose', NEW.purpose
      )
    ) RETURNING id INTO v_instance_id;
  ELSE
    UPDATE workflow_instances
       SET status = v_to_status,
           current_stage = v_to_status,
           vehicle_id = COALESCE(NEW.vehicle_id, vehicle_id),
           driver_id = COALESCE(NEW.driver_id, driver_id),
           assigned_to = COALESCE(v_assignee, assigned_to),
           completed_at = CASE
             WHEN v_to_status IN ('fulfilled','completed','cancelled','rejected')
               THEN now() ELSE completed_at END,
           updated_at = now()
     WHERE id = v_instance_id;
  END IF;

  -- Log a transition for INSERT or whenever status changes
  IF TG_OP = 'INSERT' OR v_from_status IS DISTINCT FROM v_to_status THEN
    INSERT INTO workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, performed_by, notes, payload
    ) VALUES (
      NEW.organization_id, v_instance_id, 'fuel_request',
      v_from_status, v_to_status,
      COALESCE(v_assignee, v_creator),
      CASE
        WHEN TG_OP = 'INSERT'           THEN format('Fuel request %s submitted', NEW.request_number)
        WHEN v_to_status = 'approved'   THEN format('Fuel request %s approved (%.0f L, ~%s ETB)',
                                                    NEW.request_number,
                                                    COALESCE(NEW.liters_approved, NEW.liters_requested, 0),
                                                    COALESCE(NEW.estimated_cost::text, '0'))
        WHEN v_to_status = 'rejected'   THEN format('Fuel request %s rejected: %s',
                                                    NEW.request_number,
                                                    COALESCE(NEW.rejected_reason, 'no reason'))
        WHEN v_to_status = 'work_order_issued' THEN format('Work order issued for %s', NEW.request_number)
        WHEN v_to_status = 'emoney_initiated'  THEN format('E-money transfer initiated for %s', NEW.request_number)
        WHEN v_to_status = 'wallet_funded'     THEN format('Driver wallet funded for %s', NEW.request_number)
        WHEN v_to_status = 'fulfilled'  THEN format('Fuel request %s fulfilled (%.0f L dispensed)',
                                                    NEW.request_number,
                                                    COALESCE(NEW.actual_liters, 0))
        WHEN v_to_status = 'completed'  THEN format('Fuel request %s completed', NEW.request_number)
        WHEN v_to_status = 'cancelled'  THEN format('Fuel request %s cancelled', NEW.request_number)
        ELSE format('Status changed: %s → %s', v_from_status, v_to_status)
      END,
      jsonb_build_object(
        'request_number', NEW.request_number,
        'rejected_reason', NEW.rejected_reason,
        'fuel_request_id', NEW.id,
        'liters_requested', NEW.liters_requested,
        'liters_approved', NEW.liters_approved,
        'actual_liters', NEW.actual_liters,
        'deviation_percent', NEW.deviation_percent,
        'clearance_status', NEW.clearance_status
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_sync_fuel_request_workflow ON public.fuel_requests;

CREATE TRIGGER trg_sync_fuel_request_workflow
AFTER INSERT OR UPDATE OF status, liters_approved, actual_liters, clearance_status
ON public.fuel_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_fuel_request_workflow();

-- ============================================================
-- Backfill existing fuel_requests into workflow tables
-- ============================================================
INSERT INTO workflow_instances (
  organization_id, workflow_type, reference_number, title,
  current_stage, status, vehicle_id, driver_id, created_by, assigned_to, data, created_at, updated_at, completed_at
)
SELECT
  fr.organization_id,
  'fuel_request',
  fr.request_number,
  format('Fuel Request %s', fr.request_number),
  COALESCE(fr.status, 'pending'),
  COALESCE(fr.status, 'pending'),
  fr.vehicle_id,
  fr.driver_id,
  fr.requested_by,
  fr.approved_by,
  jsonb_build_object(
    'fuel_request_id', fr.id,
    'request_type', fr.request_type,
    'fuel_type', fr.fuel_type,
    'liters_requested', fr.liters_requested,
    'estimated_cost', fr.estimated_cost,
    'station_id', fr.station_id,
    'generator_id', fr.generator_id,
    'cost_center', fr.cost_center,
    'purpose', fr.purpose
  ),
  fr.created_at,
  fr.updated_at,
  CASE WHEN fr.status IN ('fulfilled','completed','cancelled','rejected')
       THEN COALESCE(fr.fulfilled_at, fr.updated_at) ELSE NULL END
FROM fuel_requests fr
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_instances wi
   WHERE wi.workflow_type = 'fuel_request'
     AND wi.reference_number = fr.request_number
     AND wi.organization_id = fr.organization_id
);

-- Backfill a single "submitted" transition for each newly inserted instance
INSERT INTO workflow_transitions (
  organization_id, instance_id, workflow_type,
  from_stage, to_stage, performed_by, notes, payload, created_at
)
SELECT
  wi.organization_id, wi.id, 'fuel_request',
  NULL, COALESCE(fr.status, 'pending'),
  fr.requested_by,
  format('Fuel request %s backfilled (status=%s)', fr.request_number, COALESCE(fr.status, 'pending')),
  jsonb_build_object('fuel_request_id', fr.id, 'request_number', fr.request_number, 'backfill', true),
  fr.created_at
FROM workflow_instances wi
JOIN fuel_requests fr
  ON fr.request_number = wi.reference_number
 AND fr.organization_id = wi.organization_id
WHERE wi.workflow_type = 'fuel_request'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_transitions wt
     WHERE wt.instance_id = wi.id AND wt.workflow_type = 'fuel_request'
  );