DO $$
DECLARE
  v_wo uuid;
  v_po uuid;
BEGIN
  SELECT id INTO v_wo FROM work_orders
   WHERE work_order_number LIKE 'WO-E2E-%'
   ORDER BY created_at DESC LIMIT 1;

  UPDATE work_orders
     SET approval_status='approved'
   WHERE id=v_wo;

  SELECT id INTO v_po FROM purchase_orders
   WHERE work_order_id=v_wo LIMIT 1;

  RAISE NOTICE 'Auto-PO for WO % → PO %', v_wo, COALESCE(v_po::text,'(still missing)');
END $$;