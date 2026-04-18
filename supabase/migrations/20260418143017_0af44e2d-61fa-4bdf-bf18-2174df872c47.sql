-- Sync trigger: vehicle_requests -> workflow_instances + workflow_transitions
CREATE OR REPLACE FUNCTION public.sync_vehicle_request_workflow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_instance_id uuid; v_creator uuid; v_assignee uuid;
  v_from_status text; v_to_status text;
BEGIN
  SELECT id INTO v_creator FROM auth.users WHERE id = NEW.requester_id;
  SELECT id INTO v_assignee FROM auth.users WHERE id = NEW.assigned_driver_id;
  v_to_status := COALESCE(NEW.status, 'pending');
  v_from_status := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.status, 'pending') ELSE NULL END;

  SELECT id INTO v_instance_id FROM workflow_instances
    WHERE workflow_type = 'vehicle_request' AND reference_number = NEW.request_number
      AND organization_id = NEW.organization_id LIMIT 1;

  IF v_instance_id IS NULL THEN
    INSERT INTO workflow_instances (
      organization_id, workflow_type, reference_number, title,
      current_stage, status, vehicle_id, driver_id, created_by, assigned_to, data
    ) VALUES (
      NEW.organization_id, 'vehicle_request', NEW.request_number,
      format('Vehicle Request %s', NEW.request_number),
      v_to_status, v_to_status, NEW.assigned_vehicle_id, NEW.assigned_driver_id,
      v_creator, v_assignee,
      jsonb_build_object('vehicle_request_id', NEW.id, 'request_type', NEW.request_type,
        'trip_duration_days', NEW.trip_duration_days, 'purpose', NEW.purpose)
    ) RETURNING id INTO v_instance_id;
  ELSE
    UPDATE workflow_instances SET
      status = v_to_status, current_stage = v_to_status,
      vehicle_id = COALESCE(NEW.assigned_vehicle_id, vehicle_id),
      driver_id = COALESCE(NEW.assigned_driver_id, driver_id),
      assigned_to = COALESCE(v_assignee, assigned_to),
      completed_at = CASE WHEN v_to_status IN ('completed','cancelled','rejected') THEN now() ELSE completed_at END,
      updated_at = now()
    WHERE id = v_instance_id;
  END IF;

  IF TG_OP = 'INSERT' OR v_from_status IS DISTINCT FROM v_to_status THEN
    INSERT INTO workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, performed_by, notes, payload
    ) VALUES (
      NEW.organization_id, v_instance_id, 'vehicle_request',
      v_from_status, v_to_status, v_creator,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Vehicle request submitted'
        WHEN v_to_status = 'approved'    THEN format('Request %s approved', NEW.request_number)
        WHEN v_to_status = 'rejected'    THEN format('Request %s rejected: %s', NEW.request_number, COALESCE(NEW.rejection_reason,'no reason'))
        WHEN v_to_status = 'assigned'    THEN format('Request %s assigned (vehicle/driver)', NEW.request_number)
        WHEN v_to_status = 'in_progress' THEN format('Request %s — driver checked in', NEW.request_number)
        WHEN v_to_status = 'completed'   THEN format('Request %s — completed / driver checked out', NEW.request_number)
        WHEN v_to_status = 'cancelled'   THEN format('Request %s cancelled', NEW.request_number)
        ELSE format('Status changed: %s → %s', v_from_status, v_to_status)
      END,
      jsonb_build_object('request_number', NEW.request_number,
        'rejection_reason', NEW.rejection_reason, 'vehicle_request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_request_workflow ON public.vehicle_requests;
CREATE TRIGGER trg_sync_vehicle_request_workflow
AFTER INSERT OR UPDATE OF status, assigned_driver_id, assigned_vehicle_id
ON public.vehicle_requests FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_request_workflow();

-- Backfill existing vehicle requests
DO $$
DECLARE
  r RECORD; v_instance_id uuid; v_creator uuid; v_assignee uuid;
BEGIN
  FOR r IN SELECT * FROM vehicle_requests ORDER BY created_at LOOP
    SELECT id INTO v_instance_id FROM workflow_instances
      WHERE workflow_type = 'vehicle_request' AND reference_number = r.request_number
        AND organization_id = r.organization_id LIMIT 1;
    SELECT id INTO v_creator FROM auth.users WHERE id = r.requester_id;
    SELECT id INTO v_assignee FROM auth.users WHERE id = r.assigned_driver_id;

    IF v_instance_id IS NULL THEN
      INSERT INTO workflow_instances (
        organization_id, workflow_type, reference_number, title,
        current_stage, status, vehicle_id, driver_id, created_by, assigned_to,
        data, created_at, updated_at
      ) VALUES (
        r.organization_id, 'vehicle_request', r.request_number,
        format('Vehicle Request %s', r.request_number),
        COALESCE(r.status, 'pending'), COALESCE(r.status, 'pending'),
        r.assigned_vehicle_id, r.assigned_driver_id, v_creator, v_assignee,
        jsonb_build_object('vehicle_request_id', r.id, 'backfilled', true,
                           'request_type', r.request_type),
        r.created_at, COALESCE(r.updated_at, r.created_at)
      ) RETURNING id INTO v_instance_id;

      INSERT INTO workflow_transitions (
        organization_id, instance_id, workflow_type,
        from_stage, to_stage, performed_by, notes, created_at
      ) VALUES (
        r.organization_id, v_instance_id, 'vehicle_request',
        NULL, COALESCE(r.status, 'pending'), v_creator,
        format('Backfilled — final status: %s', COALESCE(r.status, 'pending')),
        r.created_at
      );
    END IF;
  END LOOP;
END $$;