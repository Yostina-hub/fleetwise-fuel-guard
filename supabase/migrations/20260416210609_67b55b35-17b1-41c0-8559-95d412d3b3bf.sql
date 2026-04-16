DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_admin uuid := 'ae6eb2e7-eb9d-4d0c-ab60-cd57b403ae23';
  v_req_id uuid; v_wo_id uuid; v_clar_id uuid;
  v_phone text := '+251911234567';
  v_amount numeric := 2500.00;
  v_used numeric := 1840.50;
  v_remaining numeric;
  v_transfer_ref text; v_pin_ref text; v_pullback_ref text;
BEGIN
  -- Set only the JWT sub (auth.uid() resolves from this); keep role=postgres so migration can commit
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

  SELECT id INTO v_req_id FROM public.fuel_requests
   WHERE request_number = 'FR-MO1TDGMU' AND organization_id = v_org;
  IF v_req_id IS NULL THEN RAISE NOTICE 'no req'; RETURN; END IF;

  UPDATE public.fuel_requests SET status='approved', approved_at=now(),
    estimated_cost=v_amount, driver_phone=v_phone WHERE id=v_req_id;

  SELECT id INTO v_wo_id FROM public.fuel_work_orders
   WHERE fuel_request_id=v_req_id ORDER BY created_at DESC LIMIT 1;

  v_transfer_ref := 'TBR-TRF-E2E-' || substr(md5(random()::text),1,8);
  INSERT INTO public.fuel_telebirr_transactions (organization_id, fuel_work_order_id, fuel_request_id,
    txn_type, provider, amount, driver_phone, request_payload, response_payload, external_ref, status)
  VALUES (v_org, v_wo_id, v_req_id, 'transfer','stub',v_amount,v_phone,
    jsonb_build_object('action','transfer','amount',v_amount,'driver_phone',v_phone),
    jsonb_build_object('stub',true,'status','initiated'), v_transfer_ref,'success');
  UPDATE public.fuel_work_orders SET emoney_initiated=true, emoney_amount=v_amount,
    emoney_transfer_status='initiated', emoney_transfer_ref=v_transfer_ref,
    telebirr_provider='stub', telebirr_request_id=v_transfer_ref WHERE id=v_wo_id;

  v_pin_ref := 'TBR-PIN-E2E-' || substr(md5(random()::text),1,8);
  INSERT INTO public.fuel_telebirr_transactions (organization_id, fuel_work_order_id, fuel_request_id,
    txn_type, provider, amount, driver_phone, request_payload, response_payload, external_ref, status)
  VALUES (v_org, v_wo_id, v_req_id, 'status','stub',v_amount,v_phone,
    jsonb_build_object('action','confirm_pin'),
    jsonb_build_object('confirm_ref',v_pin_ref,'stub',true), v_pin_ref,'success');
  UPDATE public.fuel_work_orders SET pin_confirmed_at=now(), pin_confirmation_ref=v_pin_ref,
    emoney_transfer_status='completed' WHERE id=v_wo_id;

  UPDATE public.fuel_work_orders SET
    sms_receipt_sent_at=now(),
    sms_receipt_text=format('FleetMgmt: Payment ETB %s confirmed. Ref: %s.', v_used, v_pin_ref),
    amount_used=v_used, status='completed' WHERE id=v_wo_id;

  v_remaining := v_amount - v_used;
  v_pullback_ref := 'TBR-PBK-E2E-' || substr(md5(random()::text),1,8);
  INSERT INTO public.fuel_telebirr_transactions (organization_id, fuel_work_order_id, fuel_request_id,
    txn_type, provider, amount, driver_phone, request_payload, response_payload, external_ref, status)
  VALUES (v_org, v_wo_id, v_req_id, 'pullback','stub',v_remaining,v_phone,
    jsonb_build_object('action','pullback','pullback_amount',v_remaining),
    jsonb_build_object('pullback_ref',v_pullback_ref,'stub',true), v_pullback_ref,'success');
  UPDATE public.fuel_work_orders SET pullback_initiated_at=now(), pullback_completed_at=now(),
    pullback_ref=v_pullback_ref, pullback_amount=v_remaining, amount_remaining=0 WHERE id=v_wo_id;

  UPDATE public.fuel_requests SET actual_liters=92.5, liters_approved=100.0, status='fulfilled' WHERE id=v_req_id;

  INSERT INTO public.fuel_clarification_requests (organization_id, fuel_request_id, requested_by, question, status)
  VALUES (v_org, v_req_id, v_admin, 'Actual 92.5L deviates -7.5% from approved 100L. Please justify.', 'open')
  RETURNING id INTO v_clar_id;

  UPDATE public.fuel_clarification_requests SET
    justification='Pump cut-off near full; remainder returned via Telebirr pullback.',
    justified_by=v_admin, justified_at=now(),
    status='resolved', resolved_by=v_admin, resolved_at=now(),
    resolution='Justification accepted; deviation reconciled.'
  WHERE id=v_clar_id;

  RAISE NOTICE 'E2E COMPLETE: WO=% transfer=% pin=% pullback=% clar=%',
    v_wo_id, v_transfer_ref, v_pin_ref, v_pullback_ref, v_clar_id;
END $$;