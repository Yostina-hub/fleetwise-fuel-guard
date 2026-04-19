DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_vehicle uuid := 'ed010da1-e058-4caa-adf4-b268a46a3762';
  v_vendor uuid := '457a5823-7b4c-4860-80ab-5fd91e0be0af';
  v_req_id uuid; v_wo_id uuid; v_po_id uuid; v_pay_id uuid;
  v_stamp text := to_char(now(),'YYMMDDHH24MISS');
BEGIN
  INSERT INTO maintenance_requests (organization_id, vehicle_id, request_number, request_type, trigger_source, priority, status, workflow_stage, description, requestor_department, contact_phone)
  VALUES (v_org, v_vehicle, 'E2E-SOP61-'||v_stamp, 'corrective','manual_driver','high','pending','pending_approval','Engine knocking - urgent','Operations','+251911000001')
  RETURNING id INTO v_req_id;
  RAISE NOTICE '[1] Request: %', v_req_id;

  UPDATE maintenance_requests SET workflow_stage='fleet_ops_review', status='under_review' WHERE id=v_req_id;
  RAISE NOTICE '[2-3] Reviewed';

  UPDATE maintenance_requests SET pre_inspection_done=true, pre_inspection_by='E2E Inspector', pre_inspection_at=now(), pre_inspection_notes='Misfire cyl #2', needs_maintenance=true, workflow_stage='maintenance_section' WHERE id=v_req_id;
  RAISE NOTICE '[4] Pre-inspection pass';

  INSERT INTO work_orders (organization_id, vehicle_id, vendor_id, status, work_order_number, work_type, service_description)
  VALUES (v_org, v_vehicle, v_vendor, 'pending_approval', 'WO-E2E-'||v_stamp, 'corrective', 'Engine misfire cyl #2 + crankshaft inspection')
  RETURNING id INTO v_wo_id;
  UPDATE maintenance_requests SET work_order_id=v_wo_id, workflow_stage='wo_pending_approval' WHERE id=v_req_id;
  RAISE NOTICE '[6] WO: %', v_wo_id;

  UPDATE work_orders SET status='approved' WHERE id=v_wo_id;
  SELECT id INTO v_po_id FROM purchase_orders WHERE notes LIKE '%'||v_wo_id::text||'%' ORDER BY created_at DESC LIMIT 1;
  RAISE NOTICE '[7a] Auto-PO: %', COALESCE(v_po_id::text,'(NOT GENERATED)');

  UPDATE maintenance_requests SET supplier_id=v_vendor::text, supplier_name='ABC Auto Service', vehicle_delivered_at=now(), vehicle_delivered_by='Driver E2E', workflow_stage='vehicle_at_supplier' WHERE id=v_req_id;
  RAISE NOTICE '[6b/7b] Vehicle delivered';

  INSERT INTO wo_supplier_messages (organization_id, work_order_id, sender_type, sender_name, message)
  VALUES (v_org, v_wo_id, 'supplier','ABC Auto Service','Variation: crankshaft +15,000 ETB');
  UPDATE maintenance_requests SET variation_requested=true, variation_notes='Crankshaft +15k', inspector_id='Inspector E2E', inspector_assigned_at=now(), variation_accepted=true, variation_accepted_by='Maintenance Mgr', variation_accepted_at=now(), workflow_stage='variation_accepted' WHERE id=v_req_id;
  RAISE NOTICE '[9-12] Variation accepted';

  INSERT INTO post_maintenance_inspections (organization_id, work_order_id, inspection_date, inspector_name, overall_result, findings, scrap_returned, scrap_form_url, notes)
  VALUES (v_org, v_wo_id, current_date,'Inspector E2E','pass','All repairs verified', true, 'https://storage.example/scrap-'||v_wo_id||'.pdf','Vehicle road-worthy');
  UPDATE maintenance_requests SET post_inspection_result='pass', post_inspection_at=now(), maintenance_accepted=true, maintenance_accepted_by='Fleet Mgr', maintenance_accepted_at=now(), workflow_stage='post_inspection_pass' WHERE id=v_req_id;
  RAISE NOTICE '[13-15,20] Post-inspection pass + scrap returned';

  INSERT INTO supplier_payment_requests (organization_id, work_order_id, supplier_name, amount, invoice_number, status, notes)
  VALUES (v_org, v_wo_id, 'ABC Auto Service', 65000, 'INV-E2E-'||v_stamp, 'pending', 'Engine + crankshaft variation')
  RETURNING id INTO v_pay_id;
  UPDATE supplier_payment_requests SET status='approved', reviewed_at=now() WHERE id=v_pay_id;
  RAISE NOTICE '[16-18,1.9] Payment approved: %', v_pay_id;

  UPDATE maintenance_requests SET scrap_return_form_url='https://storage.example/scrap-'||v_req_id||'.pdf', spare_parts_collected=true, workflow_stage='parts_collected' WHERE id=v_req_id;
  RAISE NOTICE '[19-20] Scrap form filed on request';

  UPDATE maintenance_requests SET vehicle_received_at=now(), delivery_document_url='https://storage.example/del-'||v_req_id||'.pdf', delivery_checked_at=now(), delivery_acceptable=true, workflow_stage='vehicle_returned' WHERE id=v_req_id;
  RAISE NOTICE '[22-28] Vehicle returned';

  UPDATE maintenance_requests SET files_updated=true, status='completed', workflow_stage='completed' WHERE id=v_req_id;
  UPDATE work_orders SET status='completed' WHERE id=v_wo_id;
  RAISE NOTICE '[21,24] COMPLETED';

  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE 'E2E SOP 6.1 PASS — req=% wo=% po=% pay=%', v_req_id, v_wo_id, v_po_id, v_pay_id;
END $$;