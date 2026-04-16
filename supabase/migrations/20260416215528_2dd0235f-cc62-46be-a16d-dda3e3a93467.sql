
-- E2E test suite for fuel request workflow
CREATE OR REPLACE FUNCTION public.run_fuel_workflow_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_vehicle uuid := '68be8a58-2d47-4311-9337-4d99de6b6cee';
  v_request_id uuid;
  v_request_number text;
  v_wo_id uuid;
  v_wo_number text;
  v_dev numeric;
  v_clearance text;
  v_emoney_amount numeric;
  v_pre_count int;
  v_post_count int;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);

  -- Step 1: Create vehicle fuel request
  v_request_number := 'FR-E2E-' || to_char(now(), 'YYMMDDHH24MISS');
  BEGIN
    INSERT INTO public.fuel_requests (
      organization_id, request_type, vehicle_id, requested_by,
      request_number, fuel_type, liters_requested, estimated_cost,
      purpose, status, priority, current_odometer
    ) VALUES (
      v_org, 'vehicle', v_vehicle, v_fleetops,
      v_request_number, 'diesel', 50, 4500,
      'E2E test fuel request', 'pending', 'medium', 100000
    ) RETURNING id INTO v_request_id;
    t_step:='1_create_request'; t_flow:='fuel'; t_status:='PASS';
    t_detail:='created '||v_request_number; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='1_create_request'; t_flow:='fuel'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step 2: Approve fuel request → trigger should auto-create work order
  BEGIN
    UPDATE public.fuel_requests SET
      status = 'approved',
      liters_approved = 50,
      approved_by = v_fleetops,
      approved_at = now()
    WHERE id = v_request_id;

    SELECT fuel_work_order_id INTO v_wo_id FROM public.fuel_requests WHERE id = v_request_id;
    IF v_wo_id IS NOT NULL THEN
      SELECT work_order_number, emoney_amount INTO v_wo_number, v_emoney_amount
        FROM public.fuel_work_orders WHERE id = v_wo_id;
      t_step:='2_auto_work_order'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='WO '||v_wo_number||' (emoney='||v_emoney_amount||')'; RETURN NEXT;
    ELSE
      t_step:='2_auto_work_order'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='no work order created on approval'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='2_auto_work_order'; t_flow:='fuel'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 3: Fulfill (within 5% tolerance) → clearance should be 'cleared'
  BEGIN
    UPDATE public.fuel_requests SET
      status = 'fulfilled',
      actual_liters = 51,    -- +2% deviation, under 5% threshold
      actual_cost = 4590
    WHERE id = v_request_id;

    SELECT clearance_status, deviation_percent INTO v_clearance, v_dev
      FROM public.fuel_requests WHERE id = v_request_id;
    IF v_clearance = 'cleared' AND ABS(v_dev) <= 5 THEN
      t_step:='3_fulfill_clearance'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='cleared, dev='||v_dev||'%'; RETURN NEXT;
    ELSE
      t_step:='3_fulfill_clearance'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='expected cleared <=5%, got '||v_clearance||' dev='||v_dev; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='3_fulfill_clearance'; t_flow:='fuel'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 4: Test deviation detection (>5% triggers deviation_detected)
  BEGIN
    UPDATE public.fuel_requests SET
      actual_liters = 60,    -- +20% deviation, exceeds 5%
      actual_cost = 5400
    WHERE id = v_request_id;

    SELECT clearance_status, deviation_percent INTO v_clearance, v_dev
      FROM public.fuel_requests WHERE id = v_request_id;
    IF v_clearance = 'deviation_detected' AND v_dev = 20 THEN
      t_step:='4_deviation_detection'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='deviation flagged at +'||v_dev||'%'; RETURN NEXT;
    ELSE
      t_step:='4_deviation_detection'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='expected deviation_detected at 20%, got '||v_clearance||' dev='||v_dev; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='4_deviation_detection'; t_flow:='fuel'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 5: Verify schema integrity for enterprise fields (vehicles & generators)
  BEGIN
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fuel_requests'
      AND column_name IN (
        'technician_name','running_hours','security_name','route',
        'driver_phone','project_number','task_number','context_value',
        'assigned_department','priority','requested_for'
      )
    HAVING COUNT(*) >= 11;
    IF FOUND THEN
      t_step:='5_schema_integrity'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='all enterprise fields present (vehicle + generator)'; RETURN NEXT;
    ELSE
      t_step:='5_schema_integrity'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='missing enterprise columns'; RETURN NEXT;
    END IF;
  END;

  -- Step 6: Check fuel work order header fields
  BEGIN
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fuel_work_orders'
      AND column_name IN (
        'work_order_type','planner_name','department','wip_accounting_class',
        'scheduled_start_date','scheduled_completion_date','warranty_status',
        'project','task','activity_type','activity_cause'
      )
    HAVING COUNT(*) >= 11;
    IF FOUND THEN
      t_step:='6_wo_oracle_header'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='Oracle-style WO fields present'; RETURN NEXT;
    ELSE
      t_step:='6_wo_oracle_header'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='missing Oracle-style WO fields'; RETURN NEXT;
    END IF;
  END;

  -- Step 7: Verify approval RPC functions exist (delegation matrix)
  BEGIN
    PERFORM 1 FROM pg_proc WHERE proname IN ('get_my_pending_fuel_approvals','action_fuel_approval');
    IF FOUND THEN
      t_step:='7_approval_rpcs'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='delegation-aware RPCs available'; RETURN NEXT;
    ELSE
      t_step:='7_approval_rpcs'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='approval RPCs missing'; RETURN NEXT;
    END IF;
  END;

  -- Step 8: Verify auto-trigger settings exist
  BEGIN
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organization_settings'
      AND column_name IN ('fuel_efficiency_threshold','fuel_auto_request_enabled');
    IF FOUND THEN
      t_step:='8_auto_trigger_config'; t_flow:='fuel'; t_status:='PASS';
      t_detail:='auto-trigger settings configured'; RETURN NEXT;
    ELSE
      t_step:='8_auto_trigger_config'; t_flow:='fuel'; t_status:='FAIL';
      t_detail:='auto-trigger config missing'; RETURN NEXT;
    END IF;
  END;

  -- Step 9: Cleanup
  DELETE FROM public.fuel_work_orders WHERE id = v_wo_id;
  DELETE FROM public.fuel_requests WHERE id = v_request_id;
  t_step:='9_cleanup'; t_flow:='fuel'; t_status:='PASS'; t_detail:='test artifacts removed'; RETURN NEXT;

  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.run_fuel_workflow_e2e_test() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_fuel_workflow_e2e_test() TO authenticated;
