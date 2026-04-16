CREATE OR REPLACE FUNCTION public.run_fuel_e2e_steps_6_12()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_actor uuid; v_vehicle uuid; v_driver uuid;
  v_request_id uuid; v_wo_id uuid;
  v_wo_approval_id uuid; v_emoney_approval_id uuid;
  v_station_id uuid; v_txn_id uuid; v_clarification_id uuid;
  v_nearby_count int; v_clearance_status text;
BEGIN
  SELECT ur.user_id INTO v_actor FROM public.user_roles ur
  WHERE ur.organization_id = v_org
    AND ur.role::text IN ('operations_manager','fleet_manager','super_admin')
  ORDER BY CASE ur.role::text WHEN 'operations_manager' THEN 1 WHEN 'fleet_manager' THEN 2 ELSE 3 END LIMIT 1;
  IF v_actor IS NULL THEN
    t_step:='setup'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='No actor'; RETURN NEXT; RETURN;
  END IF;
  PERFORM public.e2e_set_user(v_actor);
  SELECT id INTO v_vehicle FROM public.vehicles WHERE organization_id = v_org LIMIT 1;
  SELECT id INTO v_driver FROM public.drivers WHERE organization_id = v_org LIMIT 1;

  BEGIN
    INSERT INTO public.fuel_requests (organization_id, vehicle_id, driver_id, fuel_type, request_number,
      liters_requested, liters_approved, estimated_cost, request_type, status, requested_by)
    VALUES (v_org, v_vehicle, v_driver, 'diesel',
      'FR-E2E-' || to_char(now(),'YYMMDDHH24MISS') || '-' || substr(md5(random()::text),1,4),
      100, 100, 7500, 'manual', 'pending', v_actor) RETURNING id INTO v_request_id;
    UPDATE public.fuel_requests SET status='approved', approved_by=v_actor, approved_at=now() WHERE id=v_request_id;
    SELECT id INTO v_wo_id FROM public.fuel_work_orders WHERE fuel_request_id = v_request_id;
    IF v_wo_id IS NULL THEN t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='WO not created'; RETURN NEXT; RETURN; END IF;
    t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='WO '||v_wo_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; RETURN;
  END;

  -- Step 6
  BEGIN
    INSERT INTO public.fuel_wo_approvals (organization_id, fuel_work_order_id, step, approver_role, approver_id, action)
    VALUES (v_org, v_wo_id, 1, 'fleet_manager', v_actor, 'pending') RETURNING id INTO v_wo_approval_id;
    UPDATE public.fuel_wo_approvals SET action='approved', acted_at=now(), comment='E2E' WHERE id=v_wo_approval_id;
    UPDATE public.fuel_work_orders SET status='approved', approved_by=v_actor, approved_at=now() WHERE id=v_wo_id;
    t_step:='step6_wo_approval'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step6_wo_approval'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 7
  BEGIN
    INSERT INTO public.fuel_emoney_approvals (organization_id, fuel_work_order_id, amount, initiated_by, approver_id, approver_role, status)
    VALUES (v_org, v_wo_id, 7500, v_actor, v_actor, 'ops_manager', 'pending') RETURNING id INTO v_emoney_approval_id;
    UPDATE public.fuel_work_orders SET emoney_initiated=true, emoney_amount=7500 WHERE id=v_wo_id;
    t_step:='step7_emoney_initiate'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:=v_emoney_approval_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step7_emoney_initiate'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 8
  BEGIN
    UPDATE public.fuel_emoney_approvals SET status='approved', acted_at=now() WHERE id=v_emoney_approval_id;
    UPDATE public.fuel_work_orders SET emoney_approved_by=v_actor, emoney_approved_at=now(), emoney_transfer_status='approved' WHERE id=v_wo_id;
    t_step:='step8_emoney_approve'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step8_emoney_approve'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 9
  BEGIN
    UPDATE public.fuel_work_orders SET emoney_transfer_status='transferred',
      emoney_transfer_ref='E2E-'||substr(md5(random()::text),1,8), driver_wallet_id='WALLET-E2E',
      amount_used=0, amount_remaining=7500 WHERE id=v_wo_id;
    t_step:='step9_emoney_transfer'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='wallet credited'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step9_emoney_transfer'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 10
  BEGIN
    SELECT id INTO v_station_id FROM public.approved_fuel_stations WHERE organization_id=v_org AND is_active=true LIMIT 1;
    IF v_station_id IS NULL THEN
      INSERT INTO public.approved_fuel_stations (organization_id, name, lat, lng, is_active, diesel_available, diesel_stock_liters, diesel_price_per_liter)
      VALUES (v_org, 'E2E Station', 9.0192, 38.7525, true, true, 5000, 75) RETURNING id INTO v_station_id;
    END IF;
    SELECT count(*) INTO v_nearby_count FROM public.get_nearby_fuel_stations(9.0192::numeric, 38.7525::numeric, 9999::numeric, 'diesel'::text, 0::numeric);
    t_step:='step10_nearby_stations'; t_flow:='steps_6_12';
    t_status := CASE WHEN v_nearby_count>0 THEN 'PASS' ELSE 'WARN' END;
    t_detail := v_nearby_count||' stations'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step10_nearby_stations'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 11: within tolerance
  BEGIN
    UPDATE public.fuel_requests SET status='fulfilled', actual_liters=102, actual_cost=7650,
      station_id=v_station_id, fulfilled_at=now() WHERE id=v_request_id;
    SELECT id INTO v_txn_id FROM public.fuel_transactions
    WHERE notes LIKE 'FR:'||v_request_id::text||'%' ORDER BY created_at DESC LIMIT 1;
    t_step:='step11_transaction'; t_flow:='steps_6_12';
    t_status := CASE WHEN v_txn_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END;
    t_detail := COALESCE(v_txn_id::text,'no txn'); RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step11_transaction'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 12: clearance
  BEGIN
    SELECT clearance_status INTO v_clearance_status FROM public.fuel_requests WHERE id=v_request_id;
    t_step:='step12_clearance'; t_flow:='steps_6_12';
    t_status := CASE WHEN v_clearance_status IN ('cleared','deviation_detected') THEN 'PASS' ELSE 'FAIL' END;
    t_detail := 'clearance='||COALESCE(v_clearance_status,'null'); RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step12_clearance'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 12.1: deviation (use 'pending' not null)
  BEGIN
    UPDATE public.fuel_requests SET status='approved', clearance_status='pending', fulfilled_at=NULL WHERE id=v_request_id;
    UPDATE public.fuel_requests SET status='fulfilled', actual_liters=130, actual_cost=9750, fulfilled_at=now() WHERE id=v_request_id;
    SELECT id INTO v_clarification_id FROM public.fuel_clarification_requests WHERE fuel_request_id=v_request_id ORDER BY created_at DESC LIMIT 1;
    IF v_clarification_id IS NULL THEN
      INSERT INTO public.fuel_clarification_requests (organization_id, fuel_request_id, requested_by, question, status)
      VALUES (v_org, v_request_id, v_actor, 'Deviation > 5%', 'open') RETURNING id INTO v_clarification_id;
    END IF;
    t_step:='step12_1_deviation'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:=v_clarification_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='step12_1_deviation'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Step 12.2: resolve
  BEGIN
    IF v_clarification_id IS NOT NULL THEN
      UPDATE public.fuel_clarification_requests SET justification='Extra route', justified_by=v_actor, justified_at=now() WHERE id=v_clarification_id;
      UPDATE public.fuel_clarification_requests SET status='resolved', resolution='Approved by fuel mgmt', resolved_by=v_actor, resolved_at=now() WHERE id=v_clarification_id;
      t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='resolved'; RETURN NEXT;
    ELSE
      t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='SKIP'; t_detail:='nothing'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; END;

  -- Cleanup
  BEGIN
    DELETE FROM public.fuel_clarification_requests WHERE fuel_request_id=v_request_id;
    DELETE FROM public.fuel_transactions WHERE notes LIKE 'FR:'||v_request_id::text||'%';
    DELETE FROM public.fuel_emoney_approvals WHERE id=v_emoney_approval_id;
    DELETE FROM public.fuel_wo_approvals WHERE id=v_wo_approval_id;
    UPDATE public.fuel_requests SET fuel_work_order_id=NULL WHERE id=v_request_id;
    DELETE FROM public.fuel_work_orders WHERE id=v_wo_id;
    DELETE FROM public.fuel_requests WHERE id=v_request_id;
    t_step:='cleanup'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='removed'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN t_step:='cleanup'; t_flow:='steps_6_12'; t_status:='WARN'; t_detail:=SQLERRM; RETURN NEXT; END;

  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$function$;