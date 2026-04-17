CREATE OR REPLACE FUNCTION public.__e2e_test_fuel_workflow()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  v_vehicle UUID := '2a4ab4e3-7c01-4d3b-a32f-f3dc8676ab32';
  v_driver_record UUID := 'f74d4a49-30e7-4311-87fb-fee4a0e4ce27';
  v_requester UUID := 'ad4facd8-73f9-4472-bff0-2283d0766b89';
  v_om_user UUID := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_request_id UUID;
  v_request_no TEXT := 'E2E-' || to_char(now(), 'HH24MISSMS');
  v_route_result TEXT;
  v_action1 TEXT;
  v_action2 TEXT;
  v_action_emoney TEXT;
  v_emoney_id UUID;
  v_step1 RECORD;
  v_step2 RECORD;
  v_request_after RECORD;
  v_wo_after RECORD;
  v_log JSONB := '[]'::jsonb;
BEGIN
  -- Step 1: submit
  INSERT INTO fuel_requests (
    organization_id, vehicle_id, driver_id, requested_by, request_number,
    fuel_type, liters_requested, estimated_cost,
    request_type, trigger_source, status, clearance_status,
    purpose, current_odometer, fuel_request_type
  ) VALUES (v_org, v_vehicle, v_driver_record, v_requester, v_request_no,
    'diesel', 80, 6500, 'vehicle', 'manual', 'pending', 'pending',
    'E2E delivery', 12500, 'normal'
  ) RETURNING id INTO v_request_id;
  v_log := v_log || jsonb_build_object('step',1,'name','submit','request_no',v_request_no,'id',v_request_id);

  -- Step 2: route (simulate as requester)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_requester::text, 'role','authenticated')::text, true);
  v_route_result := route_fuel_request_approval(v_request_id);
  SELECT * INTO v_step1 FROM fuel_request_approvals WHERE fuel_request_id=v_request_id AND step=1;
  SELECT * INTO v_step2 FROM fuel_request_approvals WHERE fuel_request_id=v_request_id AND step=2;
  v_log := v_log || jsonb_build_object('step',2,'name','route','result',v_route_result,
    'step1_role',v_step1.approver_role,'step1_user',v_step1.approver_id,
    'step2_role',v_step2.approver_role,'step2_user',v_step2.approver_id);

  -- Step 3: approve step 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_step1.approver_id::text, 'role','authenticated')::text, true);
  v_action1 := action_fuel_approval(v_step1.id, 'approved', 'FM ok');
  v_log := v_log || jsonb_build_object('step',3,'name','approve_step1','result',v_action1);

  -- Step 4: approve step 2
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_step2.approver_id::text, 'role','authenticated')::text, true);
  v_action2 := action_fuel_approval(v_step2.id, 'approved', 'OM ok');
  v_log := v_log || jsonb_build_object('step',4,'name','approve_step2','result',v_action2);

  -- Step 5: WO auto-created
  SELECT * INTO v_request_after FROM fuel_requests WHERE id=v_request_id;
  SELECT * INTO v_wo_after FROM fuel_work_orders WHERE id=v_request_after.fuel_work_order_id;
  v_log := v_log || jsonb_build_object('step',5,'name','wo_auto_created',
    'wo_id',v_wo_after.id,'wo_number',v_wo_after.work_order_number,
    'wo_status',v_wo_after.status,'amount',v_wo_after.emoney_amount);

  -- Step 6: initiate e-money
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_om_user::text, 'role','authenticated')::text, true);
  v_emoney_id := initiate_fuel_emoney_request(v_wo_after.id, 6500);
  SELECT * INTO v_wo_after FROM fuel_work_orders WHERE id=v_request_after.fuel_work_order_id;
  v_log := v_log || jsonb_build_object('step',6,'name','initiate_emoney','approval_id',v_emoney_id,
    'wo_emoney_status',v_wo_after.emoney_transfer_status);

  -- Step 7: approve e-money
  v_action_emoney := action_fuel_emoney_approval(v_emoney_id, 'approved', 'transfer ok');
  SELECT * INTO v_wo_after FROM fuel_work_orders WHERE id=v_request_after.fuel_work_order_id;
  v_log := v_log || jsonb_build_object('step',7,'name','approve_emoney','result',v_action_emoney,
    'wo_emoney_status',v_wo_after.emoney_transfer_status);

  -- Step 10-13: driver fuels at station, record actual + deviation
  UPDATE fuel_requests SET 
    actual_liters = 75, actual_cost = 6100,
    status = 'fulfilled', fulfilled_at = now(),
    deviation_percent = ROUND(((75.0 - 80.0) / 80.0 * 100)::numeric, 2)
  WHERE id = v_request_id;
  v_log := v_log || jsonb_build_object('step',10,'name','fulfilled','actual_l',75,'deviation_pct',-6.25);

  -- Step 14: clearance
  UPDATE fuel_requests SET clearance_status='cleared', clearance_approved_at=now() WHERE id = v_request_id;
  v_log := v_log || jsonb_build_object('step',14,'name','clearance_approved');

  SELECT * INTO v_request_after FROM fuel_requests WHERE id=v_request_id;
  SELECT * INTO v_wo_after FROM fuel_work_orders WHERE id=v_request_after.fuel_work_order_id;
  v_log := v_log || jsonb_build_object('step',99,'name','final',
    'request_status',v_request_after.status,'clearance',v_request_after.clearance_status,
    'deviation',v_request_after.deviation_percent,'actual_l',v_request_after.actual_liters,
    'wo_status',v_wo_after.status,'wo_emoney',v_wo_after.emoney_transfer_status);

  RETURN v_log;
END;
$$;

-- Run it
DO $$
DECLARE r jsonb;
BEGIN
  r := public.__e2e_test_fuel_workflow();
  RAISE NOTICE 'E2E LOG: %', jsonb_pretty(r);
END $$;

-- Cleanup
DROP FUNCTION IF EXISTS public.__e2e_test_fuel_workflow();