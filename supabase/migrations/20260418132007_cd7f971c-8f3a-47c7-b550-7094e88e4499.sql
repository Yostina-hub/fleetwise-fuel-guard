
-- E2E Vehicle Request Lifecycle Test for VR-MO4D1WFK
-- Mirrors the UI mutations: approve → assign → check-in → check-out

DO $$
DECLARE
  v_request_id uuid := 'a50714ae-230f-4c3c-9874-c29871b61e22';
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
  v_vehicle_id uuid := '02c0cbe5-5135-4bbf-a4ad-5a78fbf926ae';
  v_driver_id uuid := 'f74d4a49-30e7-4311-87fb-fee4a0e4ce27';
  v_ops_mgr_id uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
BEGIN
  -- STEP 2 (continued): Operations Manager approves
  UPDATE vehicle_requests
  SET status = 'approved',
      approval_status = 'approved',
      updated_at = now()
  WHERE id = v_request_id;

  -- STEP 3: Dispatcher assigns vehicle + driver
  UPDATE vehicle_requests
  SET status = 'assigned',
      assigned_vehicle_id = v_vehicle_id,
      assigned_driver_id = v_driver_id,
      assigned_at = now(),
      assigned_by = v_ops_mgr_id,
      actual_assignment_minutes = EXTRACT(EPOCH FROM (now() - created_at))/60,
      updated_at = now()
  WHERE id = v_request_id;

  UPDATE vehicles SET status = 'in_use', updated_at = now() WHERE id = v_vehicle_id;
  UPDATE drivers SET status = 'on_trip', updated_at = now() WHERE id = v_driver_id;

  -- STEP 4: Driver checks in (start of trip)
  UPDATE vehicle_requests
  SET driver_checked_in_at = now(),
      driver_checkin_odometer = 45000,
      driver_checkin_notes = 'E2E test: Vehicle in good condition, ready for trip',
      updated_at = now()
  WHERE id = v_request_id;

  -- STEP 5: Driver checks out (trip completed)
  UPDATE vehicle_requests
  SET driver_checked_out_at = now() + interval '2 hours',
      driver_checkout_odometer = 45085,
      distance_log_km = 85,
      status = 'completed',
      completed_at = now() + interval '2 hours',
      updated_at = now()
  WHERE id = v_request_id;

  -- Reset vehicle/driver to available/active
  UPDATE vehicles SET status = 'available', updated_at = now() WHERE id = v_vehicle_id;
  UPDATE drivers SET status = 'active', updated_at = now() WHERE id = v_driver_id;
END $$;
