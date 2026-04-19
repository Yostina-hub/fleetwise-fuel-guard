-- ════════════════════════════════════════════════════════════════════════════
-- Sync Maintenance Requests into the workflow engine.
-- Mirrors the proven sync_vehicle_request_workflow() pattern.
-- Validates user references against auth.users to avoid FK violations.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_maintenance_request_workflow()
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
  v_ref text;
BEGIN
  -- Resolve & validate user FKs (NULL-out if user no longer exists)
  SELECT id INTO v_creator FROM auth.users WHERE id = NEW.requested_by;
  SELECT id INTO v_assignee FROM auth.users WHERE id = NEW.approver_user_id;

  v_to_status := COALESCE(NEW.workflow_stage, NEW.status, 'submitted');
  v_from_status := CASE
    WHEN TG_OP = 'UPDATE'
      THEN COALESCE(OLD.workflow_stage, OLD.status, 'submitted')
    ELSE NULL
  END;
  v_ref := COALESCE(NEW.request_number, NEW.id::text);

  SELECT id INTO v_instance_id
  FROM public.workflow_instances
  WHERE workflow_type = 'maintenance_request'
    AND reference_number = v_ref
    AND organization_id = NEW.organization_id
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    INSERT INTO public.workflow_instances (
      organization_id, workflow_type, reference_number, title,
      current_stage, status, vehicle_id, driver_id, created_by, assigned_to, data
    ) VALUES (
      NEW.organization_id,
      'maintenance_request',
      v_ref,
      format('Maintenance Request %s', v_ref),
      v_to_status,
      v_to_status,
      NEW.vehicle_id,
      NEW.driver_id,
      v_creator,
      v_assignee,
      jsonb_build_object(
        'maintenance_request_id', NEW.id,
        'request_type', NEW.request_type,
        'priority', NEW.priority,
        'trigger_source', NEW.trigger_source,
        'description', NEW.description
      )
    )
    RETURNING id INTO v_instance_id;
  ELSE
    UPDATE public.workflow_instances SET
      status = v_to_status,
      current_stage = v_to_status,
      vehicle_id = COALESCE(NEW.vehicle_id, vehicle_id),
      driver_id = COALESCE(NEW.driver_id, driver_id),
      assigned_to = COALESCE(v_assignee, assigned_to),
      completed_at = CASE
        WHEN v_to_status IN ('completed','cancelled','rejected') THEN now()
        ELSE completed_at
      END,
      updated_at = now()
    WHERE id = v_instance_id;
  END IF;

  IF TG_OP = 'INSERT' OR v_from_status IS DISTINCT FROM v_to_status THEN
    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, performed_by, notes, payload
    ) VALUES (
      NEW.organization_id, v_instance_id, 'maintenance_request',
      v_from_status, v_to_status, v_creator,
      CASE
        WHEN TG_OP = 'INSERT'              THEN format('Maintenance request %s submitted', v_ref)
        WHEN v_to_status = 'approved'      THEN format('Request %s approved', v_ref)
        WHEN v_to_status = 'rejected'      THEN format('Request %s rejected: %s', v_ref, COALESCE(NEW.rejection_reason,'no reason'))
        WHEN v_to_status = 'in_progress'   THEN format('Request %s — work started', v_ref)
        WHEN v_to_status = 'completed'     THEN format('Request %s — completed', v_ref)
        WHEN v_to_status = 'cancelled'     THEN format('Request %s cancelled', v_ref)
        ELSE format('Stage changed: %s → %s', v_from_status, v_to_status)
      END,
      jsonb_build_object(
        'request_number', v_ref,
        'rejection_reason', NEW.rejection_reason,
        'maintenance_request_id', NEW.id,
        'work_order_id', NEW.work_order_id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_maintenance_request_workflow ON public.maintenance_requests;
CREATE TRIGGER trg_sync_maintenance_request_workflow
AFTER INSERT OR UPDATE OF status, workflow_stage, approver_user_id, vehicle_id, driver_id, work_order_id
ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_maintenance_request_workflow();

-- ════════════════════════════════════════════════════════════════════════════
-- Backfill existing maintenance_requests into workflow_instances, validating
-- user FKs first to avoid violating workflow_instances_*_fkey constraints.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.workflow_instances (
  organization_id, workflow_type, reference_number, title,
  current_stage, status, vehicle_id, driver_id, created_by, assigned_to, data
)
SELECT
  mr.organization_id,
  'maintenance_request',
  COALESCE(mr.request_number, mr.id::text),
  format('Maintenance Request %s', COALESCE(mr.request_number, mr.id::text)),
  COALESCE(mr.workflow_stage, mr.status, 'submitted'),
  COALESCE(mr.workflow_stage, mr.status, 'submitted'),
  mr.vehicle_id,
  mr.driver_id,
  (SELECT id FROM auth.users WHERE id = mr.requested_by),
  (SELECT id FROM auth.users WHERE id = mr.approver_user_id),
  jsonb_build_object(
    'maintenance_request_id', mr.id,
    'request_type', mr.request_type,
    'priority', mr.priority,
    'description', mr.description
  )
FROM public.maintenance_requests mr
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_instances wi
  WHERE wi.workflow_type = 'maintenance_request'
    AND wi.reference_number = COALESCE(mr.request_number, mr.id::text)
    AND wi.organization_id = mr.organization_id
);