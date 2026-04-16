CREATE OR REPLACE FUNCTION public.run_maintenance_workflow_e2e_test()
RETURNS TABLE(step text, flow text, status text, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  v_outside_lat numeric := 9.1000;
  v_outside_lng numeric := 38.9000;
  v_req_a uuid;
  v_req_b uuid;
  v_po_id uuid;
  v_check record;
  v_req record;
BEGIN
  -- SETUP: geofence
  INSERT INTO geofences (organization_id, name, geometry_type, center_lat, center_lng, radius_meters, is_active, category)
  VALUES (v_org, 'E2E Supplier Workshop', 'circle', v_geo_lat, v_geo_lng, 200, true, 'supplier')
  RETURNING id INTO v_geofence;
  step:='setup'; flow:='all'; status:='OK'; detail:='Geofence: '||v_geofence::text; RETURN NEXT;

  -- ===== FLOW A: INSIDE geofence =====
  INSERT INTO vehicle_telemetry (vehicle_id, organization_id, latitude, longitude, last_communication_at, device_connected)
  VALUES (v_vehicle, v_org, v_inside_lat, v_inside_lng, now(), true)
  ON CONFLICT (vehicle_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, last_communication_at = now();

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text, 'role','authenticated')::text, true);
  INSERT INTO maintenance_requests (organization_id, vehicle_id, requested_by, request_number, request_type, priority, description, workflow_stage, status)
  VALUES (v_org, v_vehicle, v_driver_id, 'E2E-A-'||extract(epoch from now())::bigint, 'corrective', 'medium', 'E2E Flow A', 'submitted', 'pending')
  RETURNING id INTO v_req_a;
  step:='1_submit'; flow:='A_verified'; status:='PASS'; detail:=v_req_a::text; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_fleetops::text, 'role','authenticated')::text, true);
  PERFORM fleet_ops_review_request(v_req_a, 'approved', 'OK');
  step:='2-3_fleet_ops'; flow:='A_verified'; status:='PASS'; detail:='approved'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_maint::text, 'role','authenticated')::text, true);
  PERFORM maintenance_pre_inspection(v_req_a, true, 'Needs maint');
  step:='4_pre_inspection'; flow:='A_verified'; status:='PASS'; detail:='confirmed'; RETURN NEXT;

  PERFORM maintenance_create_pdr(v_req_a, 'PDR-E2E-A', 'PDR');
  step:='5_pdr'; flow:='A_verified'; status:='PASS'; detail:='PDR-E2E-A'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_scd::text, 'role','authenticated')::text, true);
  v_po_id := gen_random_uuid();
  PERFORM scd_create_po(v_req_a, v_po_id, 'SUP-E2E', 'E2E Supplier Co', v_geofence, 'PO');
  step:='6_po'; flow:='A_verified'; status:='PASS'; detail:=v_po_id::text; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text, 'role','authenticated')::text, true);
  SELECT * INTO v_check FROM verify_vehicle_at_supplier(v_req_a) LIMIT 1;
  PERFORM driver_confirm_vehicle_delivered(v_req_a, 'Delivered');
  SELECT geofence_verified_delivery INTO v_req FROM maintenance_requests WHERE id = v_req_a;
  step:='6b_delivered'; flow:='A_verified';
  status := CASE WHEN v_req.geofence_verified_delivery THEN 'PASS' ELSE 'FAIL' END;
  detail := 'verified='||v_req.geofence_verified_delivery::text||', dist='||COALESCE(round(v_check.distance_m,1)::text,'?')||'m';
  RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_supplier::text, 'role','authenticated')::text, true);
  PERFORM supplier_acknowledge_request(v_req_a, 'Started');
  step:='7_supplier_ack'; flow:='A_verified'; status:='PASS'; detail:='in_progress'; RETURN NEXT;

  PERFORM supplier_complete_work(v_req_a, 'https://e2e/inv.pdf', 'https://e2e/rep.pdf', 'Done');
  step:='9_supplier_done'; flow:='A_verified'; status:='PASS'; detail:='inspector_assigned'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_maint::text, 'role','authenticated')::text, true);
  PERFORM inspector_post_inspection(v_req_a, 'pass', 'Quality OK');
  step:='21_inspection'; flow:='A_verified'; status:='PASS'; detail:='pass'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_supplier::text, 'role','authenticated')::text, true);
  PERFORM supplier_mark_delivered_back(v_req_a, 'https://e2e/handover.pdf', 'Ready');
  step:='22_handover'; flow:='A_verified'; status:='PASS'; detail:='ready'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_fleetops::text, 'role','authenticated')::text, true);
  PERFORM delivery_check_decision(v_req_a, true, 'https://e2e/check.pdf', 'OK');
  step:='28_delivery_check'; flow:='A_verified'; status:='PASS'; detail:='accepted'; RETURN NEXT;

  UPDATE vehicle_telemetry SET latitude = v_outside_lat, longitude = v_outside_lng, last_communication_at = now()
    WHERE vehicle_id = v_vehicle;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text, 'role','authenticated')::text, true);
  PERFORM driver_confirm_vehicle_received(v_req_a, 'Back at depot');
  SELECT status, workflow_stage INTO v_req FROM maintenance_requests WHERE id = v_req_a;
  step:='23_received'; flow:='A_verified';
  status := CASE WHEN v_req.status='completed' THEN 'PASS' ELSE 'FAIL' END;
  detail := 'status='||v_req.status||', stage='||v_req.workflow_stage;
  RETURN NEXT;

  -- ===== FLOW B: OUTSIDE geofence =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text, 'role','authenticated')::text, true);
  INSERT INTO maintenance_requests (organization_id, vehicle_id, requested_by, request_number, request_type, priority, description, workflow_stage, status)
  VALUES (v_org, v_vehicle, v_driver_id, 'E2E-B-'||extract(epoch from now())::bigint, 'corrective', 'medium', 'E2E Flow B', 'submitted', 'pending')
  RETURNING id INTO v_req_b;
  step:='1_submit'; flow:='B_unverified'; status:='PASS'; detail:=v_req_b::text; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_fleetops::text, 'role','authenticated')::text, true);
  PERFORM fleet_ops_review_request(v_req_b, 'approved', 'OK');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_maint::text, 'role','authenticated')::text, true);
  PERFORM maintenance_pre_inspection(v_req_b, true, 'Needs');
  PERFORM maintenance_create_pdr(v_req_b, 'PDR-E2E-B', 'PDR');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_scd::text, 'role','authenticated')::text, true);
  PERFORM scd_create_po(v_req_b, gen_random_uuid(), 'SUP-E2E', 'E2E Supplier Co', v_geofence, 'PO');
  step:='2-6_pipeline'; flow:='B_unverified'; status:='PASS'; detail:='pipeline ok'; RETURN NEXT;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text, 'role','authenticated')::text, true);
  SELECT * INTO v_check FROM verify_vehicle_at_supplier(v_req_b) LIMIT 1;
  PERFORM driver_confirm_vehicle_delivered(v_req_b, 'Driver claims delivered');
  SELECT geofence_verified_delivery INTO v_req FROM maintenance_requests WHERE id = v_req_b;
  step:='6b_delivered'; flow:='B_unverified';
  status := CASE WHEN v_req.geofence_verified_delivery=false THEN 'PASS' ELSE 'FAIL' END;
  detail := 'verified='||v_req.geofence_verified_delivery::text||', dist='||COALESCE(round(v_check.distance_m,1)::text,'?')||'m';
  RETURN NEXT;

  step:='audit_trail'; flow:='all'; status:='INFO';
  detail := 'Events: ' || (SELECT COUNT(*)::text FROM maintenance_workflow_events WHERE request_id IN (v_req_a, v_req_b));
  RETURN NEXT;

  RETURN;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_maintenance_workflow_e2e_test()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0;
BEGIN
  DELETE FROM maintenance_workflow_events WHERE request_id IN (SELECT id FROM maintenance_requests WHERE request_number LIKE 'E2E-%');
  DELETE FROM maintenance_requests WHERE request_number LIKE 'E2E-%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  DELETE FROM geofences WHERE name = 'E2E Supplier Workshop';
  RETURN 'Removed '||v_count||' E2E requests';
END $$;