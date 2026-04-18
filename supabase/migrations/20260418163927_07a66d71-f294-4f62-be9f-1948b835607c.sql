-- 1) Fix the broken trigger (references non-existent columns)
CREATE OR REPLACE FUNCTION public.link_previous_tire_for_request_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id UUID;
  v_prev_tire UUID;
BEGIN
  IF NEW.previous_tire_id IS NULL THEN
    SELECT vehicle_id INTO v_vehicle_id FROM public.tire_requests WHERE id = NEW.request_id;
    IF v_vehicle_id IS NOT NULL THEN
      SELECT id INTO v_prev_tire
      FROM public.vehicle_tires
      WHERE vehicle_id = v_vehicle_id
        AND position = NEW.position
      ORDER BY install_date DESC NULLS LAST
      LIMIT 1;
      NEW.previous_tire_id := v_prev_tire;
      IF v_prev_tire IS NULL THEN
        NEW.iproc_return_status := 'not_required';
        NEW.return_skip_reason := COALESCE(NEW.return_skip_reason, 'First install — no previous tire');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Rewrite vehicle E2E test against vehicle_requests (the real table)
CREATE OR REPLACE FUNCTION public.run_vehicle_request_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_vehicle uuid;
  v_driver uuid;
  v_request_id uuid;
  v_request_number text;
  v_routed text;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);
  SELECT id INTO v_vehicle FROM public.vehicles WHERE organization_id = v_org LIMIT 1;
  SELECT id INTO v_driver FROM public.drivers WHERE organization_id = v_org LIMIT 1;

  -- Step 1: create vehicle_request
  v_request_number := 'VR-E2E-' || to_char(now(), 'YYMMDDHH24MISS');
  BEGIN
    INSERT INTO public.vehicle_requests (
      organization_id, request_number, requester_id, requester_name,
      purpose, request_type, priority, needed_from, needed_until,
      passengers, status
    ) VALUES (
      v_org, v_request_number, v_fleetops, 'E2E Fleet Ops',
      'E2E vehicle request', 'routine', 'normal',
      now() + interval '1 day', now() + interval '2 days',
      1, 'pending'
    ) RETURNING id INTO v_request_id;
    t_step:='1_create_request'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='created '||v_request_number; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='1_create_request'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step 2: route via delegation matrix
  BEGIN
    SELECT public.route_vehicle_request_approval(v_request_id) INTO v_routed;
    t_step:='2_route_approval'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='routed to '||COALESCE(v_routed,'(no rule)'); RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='2_route_approval'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 3: approve
  BEGIN
    UPDATE public.vehicle_requests
       SET status='approved'
     WHERE id = v_request_id;
    t_step:='3_approve'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='request approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='3_approve'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 4: dispatch (assign vehicle + driver)
  BEGIN
    UPDATE public.vehicle_requests SET
      assigned_vehicle_id = v_vehicle,
      assigned_driver_id = v_driver,
      assigned_by = v_fleetops,
      assigned_at = now(),
      status = 'assigned'
    WHERE id = v_request_id;
    t_step:='4_dispatch'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='vehicle+driver assigned'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='4_dispatch'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 5: complete
  BEGIN
    UPDATE public.vehicle_requests
       SET status='completed', completed_at=now()
     WHERE id = v_request_id;
    t_step:='5_complete'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='trip completed'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='5_complete'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;
END;
$$;

-- Update cleanup
CREATE OR REPLACE FUNCTION public.cleanup_vehicle_request_e2e_test()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_a int; v_b int;
BEGIN
  DELETE FROM public.vehicle_requests WHERE request_number LIKE 'VR-E2E-%';
  GET DIAGNOSTICS v_a = ROW_COUNT;
  DELETE FROM public.trip_requests WHERE request_number LIKE 'TR-E2E-%';
  GET DIAGNOSTICS v_b = ROW_COUNT;
  RETURN 'deleted '||v_a||' vehicle_requests + '||v_b||' trip_requests';
END;
$$;