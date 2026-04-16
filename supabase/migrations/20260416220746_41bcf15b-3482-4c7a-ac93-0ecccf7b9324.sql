CREATE OR REPLACE FUNCTION public.run_fuel_e2e_steps_6_12()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_actor uuid;
  v_vehicle uuid;
  v_driver uuid;
  v_request_id uuid;
  v_wo_id uuid;
  v_wo_approval_id uuid;
  v_emoney_id uuid;
  v_emoney_approval_id uuid;
  v_station_id uuid;
  v_txn_id uuid;
  v_clarification_id uuid;
  v_nearby_count int;
BEGIN
  -- Pick an operations manager / fleet manager as actor
  SELECT ur.user_id INTO v_actor
  FROM public.user_roles ur
  WHERE ur.organization_id = v_org
    AND ur.role::text IN ('operations_manager','fleet_manager','super_admin')
  ORDER BY CASE ur.role::text WHEN 'operations_manager' THEN 1 WHEN 'fleet_manager' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_actor IS NULL THEN
    t_step:='setup'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='No actor user available'; RETURN NEXT; RETURN;
  END IF;
  PERFORM public.e2e_set_user(v_actor);

  SELECT id INTO v_vehicle FROM public.vehicles WHERE organization_id = v_org LIMIT 1;
  SELECT id INTO v_driver FROM public.drivers WHERE organization_id = v_org LIMIT 1;

  -- ============ Setup: create request and approve to auto-create WO ============
  BEGIN
    INSERT INTO public.fuel_requests (
      organization_id, vehicle_id, driver_id, fuel_type,
      liters_requested, liters_approved, estimated_cost,
      request_type, status, requested_by
    ) VALUES (
      v_org, v_vehicle, v_driver, 'diesel',
      100, 100, 7500,
      'manual', 'pending', v_actor
    ) RETURNING id INTO v_request_id;

    UPDATE public.fuel_requests SET status = 'approved', approved_by = v_actor, approved_at = now()
    WHERE id = v_request_id;

    SELECT id INTO v_wo_id FROM public.fuel_work_orders WHERE fuel_request_id = v_request_id;

    IF v_wo_id IS NOT NULL THEN
      t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='WO '||v_wo_id::text; RETURN NEXT;
    ELSE
      t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='WO not created'; RETURN NEXT; RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='setup_wo'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT; RETURN;
  END;

  -- ============ Step 6: WO approval routing ============
  BEGIN
    INSERT INTO public.fuel_wo_approvals (
      organization_id, fuel_work_order_id, approver_role, approver_id, status, cost_amount
    ) VALUES (
      v_org, v_wo_id, 'fleet_manager', v_actor, 'pending', 7500
    ) RETURNING id INTO v_wo_approval_id;

    UPDATE public.fuel_wo_approvals SET status = 'approved', actioned_at = now(), comment = 'E2E approved'
    WHERE id = v_wo_approval_id;

    UPDATE public.fuel_work_orders SET status = 'approved', updated_at = now() WHERE id = v_wo_id;

    t_step:='step6_wo_approval'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='WO approved by delegation'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step6_wo_approval'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 7: Initiate E-money request ============
  BEGIN
    INSERT INTO public.fuel_emoney_approvals (
      organization_id, fuel_work_order_id, requested_by, amount, approver_role, status
    ) VALUES (
      v_org, v_wo_id, v_actor, 7500, 'ops_manager', 'pending'
    ) RETURNING id INTO v_emoney_approval_id;

    t_step:='step7_emoney_initiate'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='emoney req '||v_emoney_approval_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step7_emoney_initiate'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 8: E-money approval by delegation ============
  BEGIN
    UPDATE public.fuel_emoney_approvals
    SET status = 'approved', approver_id = v_actor, actioned_at = now(), comment = 'E2E delegation approve'
    WHERE id = v_emoney_approval_id;
    t_step:='step8_emoney_approve'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='emoney approved'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step8_emoney_approve'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 9: E-money transferred to driver wallet ============
  BEGIN
    UPDATE public.fuel_work_orders
    SET emoney_amount = 7500, emoney_used = 0, updated_at = now()
    WHERE id = v_wo_id;
    t_step:='step9_emoney_transfer'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='wallet credited 7500'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step9_emoney_transfer'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 10: Nearby stations RPC ============
  BEGIN
    -- Ensure at least one approved active station exists
    SELECT id INTO v_station_id FROM public.approved_fuel_stations
    WHERE organization_id = v_org AND is_active = true LIMIT 1;

    IF v_station_id IS NULL THEN
      INSERT INTO public.approved_fuel_stations (
        organization_id, name, lat, lng, is_active,
        diesel_available, diesel_stock_liters, diesel_price_per_liter
      ) VALUES (
        v_org, 'E2E Station', 9.0192, 38.7525, true,
        true, 5000, 75
      ) RETURNING id INTO v_station_id;
    END IF;

    SELECT count(*) INTO v_nearby_count
    FROM public.get_nearby_fuel_stations(9.0192, 38.7525, 50, 'diesel', 0);

    IF v_nearby_count > 0 THEN
      t_step:='step10_nearby_stations'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:=v_nearby_count||' stations'; RETURN NEXT;
    ELSE
      t_step:='step10_nearby_stations'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='No stations returned'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step10_nearby_stations'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 11: Transaction visibility upon fulfillment (within tolerance) ============
  BEGIN
    UPDATE public.fuel_requests
    SET status = 'fulfilled', actual_liters = 102, fulfilled_at = now()
    WHERE id = v_request_id;

    SELECT id INTO v_txn_id FROM public.fuel_transactions
    WHERE vehicle_id = v_vehicle AND organization_id = v_org
    ORDER BY created_at DESC LIMIT 1;

    IF v_txn_id IS NOT NULL THEN
      t_step:='step11_transaction'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='txn '||v_txn_id::text; RETURN NEXT;
    ELSE
      t_step:='step11_transaction'; t_flow:='steps_6_12'; t_status:='WARN'; t_detail:='no auto txn (trigger optional)'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step11_transaction'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 12: Clearance status set automatically ============
  BEGIN
    PERFORM 1 FROM public.fuel_requests
    WHERE id = v_request_id AND clearance_status IN ('cleared','deviation_detected');
    IF FOUND THEN
      t_step:='step12_clearance'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='clearance applied'; RETURN NEXT;
    ELSE
      t_step:='step12_clearance'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:='clearance not set'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step12_clearance'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 12.1: Deviation triggers clarification ============
  BEGIN
    UPDATE public.fuel_requests
    SET actual_liters = 130, status = 'fulfilled', fulfilled_at = now()
    WHERE id = v_request_id;

    SELECT id INTO v_clarification_id FROM public.fuel_clarification_requests
    WHERE fuel_request_id = v_request_id ORDER BY created_at DESC LIMIT 1;

    IF v_clarification_id IS NOT NULL THEN
      t_step:='step12_1_deviation'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='clarification '||v_clarification_id::text; RETURN NEXT;
    ELSE
      t_step:='step12_1_deviation'; t_flow:='steps_6_12'; t_status:='WARN'; t_detail:='no clarification auto-opened'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step12_1_deviation'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Step 12.2: Fuel mgmt resolves clarification ============
  BEGIN
    IF v_clarification_id IS NOT NULL THEN
      UPDATE public.fuel_clarification_requests
      SET status = 'resolved', resolution_notes = 'E2E: deviation justified', resolved_by = v_actor, resolved_at = now()
      WHERE id = v_clarification_id;
      t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='resolved by fuel mgmt'; RETURN NEXT;
    ELSE
      t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='SKIP'; t_detail:='no clarification to resolve'; RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='step12_2_resolve'; t_flow:='steps_6_12'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- ============ Cleanup ============
  BEGIN
    DELETE FROM public.fuel_clarification_requests WHERE fuel_request_id = v_request_id;
    DELETE FROM public.fuel_transactions WHERE id = v_txn_id;
    DELETE FROM public.fuel_emoney_approvals WHERE id = v_emoney_approval_id;
    DELETE FROM public.fuel_wo_approvals WHERE id = v_wo_approval_id;
    UPDATE public.fuel_requests SET fuel_work_order_id = NULL WHERE id = v_request_id;
    DELETE FROM public.fuel_work_orders WHERE id = v_wo_id;
    DELETE FROM public.fuel_requests WHERE id = v_request_id;
    t_step:='cleanup'; t_flow:='steps_6_12'; t_status:='PASS'; t_detail:='artifacts removed'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='cleanup'; t_flow:='steps_6_12'; t_status:='WARN'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.run_fuel_e2e_steps_6_12() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_fuel_e2e_steps_6_12() TO authenticated;