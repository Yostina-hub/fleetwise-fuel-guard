-- ====================================================================
-- VEHICLE REQUEST + DISPATCH E2E TEST
-- ====================================================================
CREATE OR REPLACE FUNCTION public.run_vehicle_request_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_vehicle uuid;
  v_driver uuid;
  v_request_id uuid;
  v_request_number text;
  v_assignment_id uuid;
  v_routed text;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);
  SELECT id INTO v_vehicle FROM public.vehicles
    WHERE organization_id = v_org LIMIT 1;
  SELECT id INTO v_driver FROM public.drivers
    WHERE organization_id = v_org LIMIT 1;

  -- Step 1: create trip request
  v_request_number := 'TR-E2E-' || to_char(now(), 'YYMMDDHH24MISS');
  BEGIN
    INSERT INTO public.trip_requests (
      organization_id, requester_id, request_number, purpose,
      pickup_at, return_at, passenger_count, status, priority
    ) VALUES (
      v_org, v_fleetops, v_request_number, 'E2E vehicle request',
      now() + interval '1 day', now() + interval '2 days',
      1, 'submitted', 'normal'
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
    UPDATE public.trip_requests
       SET status='approved', approved_at=now()
     WHERE id = v_request_id;
    t_step:='3_approve'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='request approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='3_approve'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 4: dispatch (assign vehicle + driver)
  BEGIN
    INSERT INTO public.trip_assignments (
      organization_id, trip_request_id, vehicle_id, driver_id,
      status, dispatched_at
    ) VALUES (
      v_org, v_request_id, v_vehicle, v_driver,
      'dispatched', now()
    ) RETURNING id INTO v_assignment_id;
    t_step:='4_dispatch'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='assignment '||v_assignment_id; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='4_dispatch'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 5: check-in (start) and check-out (complete)
  BEGIN
    UPDATE public.trip_assignments
       SET status='in_progress', started_at=now()
     WHERE id = v_assignment_id;
    UPDATE public.trip_assignments
       SET status='completed', completed_at=now()
     WHERE id = v_assignment_id;
    UPDATE public.trip_requests SET status='completed' WHERE id=v_request_id;
    t_step:='5_complete'; t_flow:='vehicle'; t_status:='PASS';
    t_detail:='trip completed'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='5_complete'; t_flow:='vehicle'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;
END;
$function$;

-- Cleanup
CREATE OR REPLACE FUNCTION public.cleanup_vehicle_request_e2e_test()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM public.trip_requests WHERE request_number LIKE 'TR-E2E-%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN 'deleted '||v_count||' trip requests';
END;
$$;

-- ====================================================================
-- OUTSOURCE PAYMENT + TIRE REQUEST E2E TEST
-- ====================================================================
CREATE OR REPLACE FUNCTION public.run_outsource_tire_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_vehicle uuid;
  v_driver uuid;
  v_contract_id uuid;
  v_payment_id uuid;
  v_payment_number text;
  v_chain_count int;
  v_act jsonb;
  v_tire_id uuid;
  v_tire_number text;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);
  SELECT id INTO v_vehicle FROM public.vehicles WHERE organization_id=v_org LIMIT 1;
  SELECT id INTO v_driver FROM public.drivers WHERE organization_id=v_org LIMIT 1;

  -- ---- Outsource payment branch ----
  -- Step O1: ensure a contract exists
  BEGIN
    SELECT id INTO v_contract_id FROM public.outsource_contracts
      WHERE organization_id=v_org AND status='active' LIMIT 1;
    IF v_contract_id IS NULL THEN
      INSERT INTO public.outsource_contracts (
        organization_id, contract_number, contractor_name,
        contract_type, start_date, status, monthly_cost
      ) VALUES (
        v_org, 'CT-E2E-'||to_char(now(),'YYMMDDHH24MISS'),
        'E2E Test Contractor', 'driver_outsource',
        current_date - 30, 'active', 50000
      ) RETURNING id INTO v_contract_id;
    END IF;
    t_step:='O1_contract'; t_flow:='outsource'; t_status:='PASS';
    t_detail:='contract '||v_contract_id; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='O1_contract'; t_flow:='outsource'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step O2: create payment request
  v_payment_number := 'OPR-E2E-'||to_char(now(),'YYMMDDHH24MISS');
  BEGIN
    INSERT INTO public.outsource_payment_requests (
      organization_id, request_number, contract_id,
      period_start, period_end, amount_requested,
      status, submitted_by, submitted_at
    ) VALUES (
      v_org, v_payment_number, v_contract_id,
      current_date - 30, current_date, 25000,
      'submitted', v_fleetops, now()
    ) RETURNING id INTO v_payment_id;
    t_step:='O2_create_payment'; t_flow:='outsource'; t_status:='PASS';
    t_detail:='created '||v_payment_number; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='O2_create_payment'; t_flow:='outsource'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step O3: build approval chain
  BEGIN
    SELECT public.build_outsource_payment_approval_chain(v_payment_id) INTO v_chain_count;
    t_step:='O3_build_chain'; t_flow:='outsource';
    t_status:= CASE WHEN v_chain_count>0 THEN 'PASS' ELSE 'FAIL' END;
    t_detail:='chain steps='||v_chain_count; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='O3_build_chain'; t_flow:='outsource'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step O4: walk approvals to "approved"
  BEGIN
    UPDATE public.outsource_payment_requests
       SET status='approved', approver_id=v_fleetops, approved_at=now(),
           amount_approved=25000
     WHERE id = v_payment_id;
    t_step:='O4_approve'; t_flow:='outsource'; t_status:='PASS';
    t_detail:='approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='O4_approve'; t_flow:='outsource'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step O5: mark paid
  BEGIN
    UPDATE public.outsource_payment_requests
       SET status='paid', paid_at=now(), payment_reference='E2E-PAY-REF'
     WHERE id = v_payment_id;
    t_step:='O5_paid'; t_flow:='outsource'; t_status:='PASS';
    t_detail:='paid'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='O5_paid'; t_flow:='outsource'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ---- Tire request branch ----
  -- Step T1: create tire request
  v_tire_number := 'TIRE-E2E-'||to_char(now(),'YYMMDDHH24MISS');
  BEGIN
    INSERT INTO public.tire_requests (
      organization_id, request_number, vehicle_id, driver_id,
      requested_by, requested_by_name, request_type, priority,
      reason, status
    ) VALUES (
      v_org, v_tire_number, v_vehicle, v_driver,
      v_fleetops, 'E2E Test', 'replacement', 'normal',
      'E2E worn tires', 'pending'
    ) RETURNING id INTO v_tire_id;
    t_step:='T1_create_tire_req'; t_flow:='tire'; t_status:='PASS';
    t_detail:='created '||v_tire_number; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='T1_create_tire_req'; t_flow:='tire'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step T2: add a request item
  BEGIN
    INSERT INTO public.tire_request_items (
      organization_id, request_id, position, tire_size,
      preferred_brand, iproc_return_status
    ) VALUES (
      v_org, v_tire_id, 'FL', '215/65R16',
      'Bridgestone', 'pending'
    );
    t_step:='T2_add_item'; t_flow:='tire'; t_status:='PASS';
    t_detail:='item added'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='T2_add_item'; t_flow:='tire'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step T3: approve
  BEGIN
    UPDATE public.tire_requests
       SET status='approved', approved_by=v_fleetops,
           approved_by_name='E2E Approver', approved_at=now()
     WHERE id = v_tire_id;
    t_step:='T3_approve'; t_flow:='tire'; t_status:='PASS';
    t_detail:='approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='T3_approve'; t_flow:='tire'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step T4: fulfill (proves the iproc-return-reminder workflow's source data)
  BEGIN
    UPDATE public.tire_requests
       SET status='fulfilled', fulfilled_at=now()
     WHERE id = v_tire_id;
    UPDATE public.tire_request_items
       SET iproc_return_status='returned',
           iproc_returned_at=now(),
           iproc_return_reference='E2E-RET-001'
     WHERE request_id = v_tire_id;
    t_step:='T4_fulfill_return'; t_flow:='tire'; t_status:='PASS';
    t_detail:='fulfilled + returned'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='T4_fulfill_return'; t_flow:='tire'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;
END;
$function$;

-- Cleanup
CREATE OR REPLACE FUNCTION public.cleanup_outsource_tire_e2e_test()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_o int; v_t int; v_c int;
BEGIN
  DELETE FROM public.outsource_payment_requests WHERE request_number LIKE 'OPR-E2E-%';
  GET DIAGNOSTICS v_o = ROW_COUNT;
  DELETE FROM public.tire_requests WHERE request_number LIKE 'TIRE-E2E-%';
  GET DIAGNOSTICS v_t = ROW_COUNT;
  DELETE FROM public.outsource_contracts WHERE contract_number LIKE 'CT-E2E-%';
  GET DIAGNOSTICS v_c = ROW_COUNT;
  RETURN 'deleted '||v_o||' payment reqs, '||v_t||' tire reqs, '||v_c||' contracts';
END;
$$;