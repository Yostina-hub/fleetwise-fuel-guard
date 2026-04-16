
CREATE OR REPLACE FUNCTION public.run_maintenance_workflow_e2e_test()
RETURNS TABLE(step text, flow text, status text, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_vehicle uuid := '68be8a58-2d47-4311-9337-4d99de6b6cee';
  v_driver_id uuid := '087decd2-238d-4b18-bf82-c2b6981d99e8';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_maint uuid := '246989e2-5b53-4545-a284-82ec526408e8';
  v_scd uuid := '794894d4-b8f8-4844-b726-3c9b703666c5';
  v_supplier uuid := '70fd44a3-207f-4488-9e06-e589090fb091';
  v_geofence uuid;
  v_geo_lat numeric := 8.9806;
  v_geo_lng numeric := 38.7578;
  v_inside_lat numeric := 8.9807;
  v_inside_lng numeric := 38.7579;
  v_outside_lat numeric := 9.1500;
  v_outside_lng numeric := 38.9000;
  v_req_a uuid;
  v_req_b uuid;
  v_po_id uuid := gen_random_uuid();
  v_req record;
  v_result jsonb;
  v_chk record;
BEGIN
  PERFORM public.cleanup_maintenance_workflow_e2e_test();
  step:='cleanup'; flow:='all'; status:='OK'; detail:='prior E2E data removed'; RETURN NEXT;

  PERFORM public.e2e_set_user(v_scd);
  INSERT INTO public.geofences (organization_id, name, geometry_type, center_lat, center_lng, radius_meters, is_active, category)
  VALUES (v_org, 'E2E Supplier Workshop', 'circle', v_geo_lat, v_geo_lng, 200, true, 'supplier')
  RETURNING id INTO v_geofence;
  step:='setup_geofence'; flow:='all'; status:='OK'; detail:=v_geofence::text; RETURN NEXT;

  -- ============ FLOW A: VERIFIED ============
  INSERT INTO public.vehicle_telemetry (vehicle_id, organization_id, latitude, longitude, last_communication_at, device_connected)
  VALUES (v_vehicle, v_org, v_inside_lat, v_inside_lng, now() - interval '1 hour', true);

  PERFORM public.e2e_set_user(v_driver_id);
  INSERT INTO public.maintenance_requests (
    organization_id, vehicle_id, requested_by, request_number, request_type, trigger_source,
    description, priority, status, workflow_stage
  ) VALUES (
    v_org, v_vehicle, v_driver_id, 'E2E-A-'||extract(epoch from now())::bigint, 'corrective', 'driver_request',
    'E2E Flow A - verified delivery', 'medium', 'pending', 'submitted'
  ) RETURNING id INTO v_req_a;
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'submitted');
  step:='step1_submit'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_fleetops);
  PERFORM public.fleet_ops_review_request(v_req_a, 'accept', 'E2E approved');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'pre_inspection');
  step:='step2_fleetops_accept'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_maint);
  PERFORM public.maintenance_pre_inspection(v_req_a, true, 'Needs work');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'wo_preparation');
  step:='step3_pre_inspection'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.maintenance_create_pdr(v_req_a, 'PDR-E2E-A-001', 'Parts list');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'approved');
  step:='step4_pdr'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_scd);
  PERFORM public.scd_create_po(v_req_a, v_po_id, v_supplier::text, 'E2E Supplier Co', v_geofence, 'PO issued');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'vehicle_delivery');
  step:='step5_po_issued'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_driver_id);
  v_result := public.driver_confirm_vehicle_delivered(v_req_a, 'arrived');
  step:='step6_driver_deliver'; flow:='A';
  IF (v_result->>'verified')::boolean = true THEN
    status:='PASS'; detail:='geofence verified, distance='||COALESCE(v_result->>'distance_m','n/a');
  ELSE
    status:='FAIL'; detail:='expected verified=true, got '||v_result::text;
  END IF;
  RETURN NEXT;
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'supplier_maintenance');
  step:='step6b_stage'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_supplier);
  PERFORM public.supplier_acknowledge_request(v_req_a, 'starting');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'supplier_maintenance');
  step:='step7_supplier_ack'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.supplier_complete_work(v_req_a, 'http://e2e/invoice.pdf', 'http://e2e/report.pdf', 'done');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'inspector_assigned');
  step:='step8_supplier_complete'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_maint);
  PERFORM public.inspector_post_inspection(v_req_a, 'pass', 'looks good');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'payment_pending');
  step:='step9_post_inspection'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_supplier);
  PERFORM public.supplier_mark_delivered_back(v_req_a, 'http://e2e/delivery.pdf', 'ready');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'delivery_check');
  step:='step10_supplier_delivered_back'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_maint);
  PERFORM public.delivery_check_decision(v_req_a, true, 'http://e2e/check.pdf', 'all good');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'vehicle_received');
  step:='step11_delivery_check'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  PERFORM public.e2e_set_user(v_driver_id);
  PERFORM public.driver_confirm_vehicle_received(v_req_a, 'back at base');
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_a, 'vehicle_received');
  step:='step12_driver_received'; flow:='A'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = v_req_a;
  step:='flow_a_summary'; flow:='A';
  IF v_req.status = 'completed' AND v_req.geofence_verified_delivery = true THEN
    status:='PASS'; detail:='completed, verified delivery';
  ELSE
    status:='FAIL'; detail:='status='||COALESCE(v_req.status,'null')||' verified='||COALESCE(v_req.geofence_verified_delivery::text,'null');
  END IF;
  RETURN NEXT;

  -- ============ FLOW B: UNVERIFIED ============
  -- Use a strictly later timestamp so verify_vehicle_at_supplier picks this row
  INSERT INTO public.vehicle_telemetry (vehicle_id, organization_id, latitude, longitude, last_communication_at, device_connected)
  VALUES (v_vehicle, v_org, v_outside_lat, v_outside_lng, now() + interval '1 hour', true);

  PERFORM public.e2e_set_user(v_driver_id);
  INSERT INTO public.maintenance_requests (
    organization_id, vehicle_id, requested_by, request_number, request_type, trigger_source,
    description, priority, status, workflow_stage
  ) VALUES (
    v_org, v_vehicle, v_driver_id, 'E2E-B-'||extract(epoch from now())::bigint, 'corrective', 'driver_request',
    'E2E Flow B - unverified delivery', 'medium', 'pending', 'submitted'
  ) RETURNING id INTO v_req_b;

  PERFORM public.e2e_set_user(v_fleetops);
  PERFORM public.fleet_ops_review_request(v_req_b, 'accept', 'B approved');
  PERFORM public.e2e_set_user(v_maint);
  PERFORM public.maintenance_pre_inspection(v_req_b, true, 'Needs work');
  PERFORM public.maintenance_create_pdr(v_req_b, 'PDR-E2E-B-001', 'Parts list');
  PERFORM public.e2e_set_user(v_scd);
  PERFORM public.scd_create_po(v_req_b, gen_random_uuid(), v_supplier::text, 'E2E Supplier Co', v_geofence, 'PO issued');

  PERFORM public.e2e_set_user(v_driver_id);
  v_result := public.driver_confirm_vehicle_delivered(v_req_b, 'far away');
  step:='step6_driver_deliver'; flow:='B';
  IF (v_result->>'verified')::boolean = false THEN
    status:='PASS'; detail:='correctly unverified, distance='||COALESCE(v_result->>'distance_m','n/a');
  ELSE
    status:='FAIL'; detail:='expected verified=false, got '||v_result::text;
  END IF;
  RETURN NEXT;
  SELECT * INTO v_chk FROM public.e2e_check_stage(v_req_b, 'supplier_maintenance');
  step:='step6b_stage'; flow:='B'; status:=v_chk.status; detail:=v_chk.detail; RETURN NEXT;

  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = v_req_b;
  step:='flow_b_summary'; flow:='B';
  IF v_req.geofence_verified_delivery = false THEN
    status:='PASS'; detail:='delivery flagged outside geofence';
  ELSE
    status:='FAIL'; detail:='verified='||COALESCE(v_req.geofence_verified_delivery::text,'null');
  END IF;
  RETURN NEXT;

  step:='done'; flow:='all'; status:='OK'; detail:='harness complete'; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.run_maintenance_workflow_e2e_test() FROM PUBLIC, anon, authenticated;
