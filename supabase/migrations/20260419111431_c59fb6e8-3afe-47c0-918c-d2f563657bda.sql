CREATE OR REPLACE FUNCTION public.fn_wo_approved_create_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_number text;
  v_existing_po_id uuid;
  v_vendor_name text;
BEGIN
  IF (TG_OP = 'UPDATE'
      AND NEW.approval_status = 'approved'
      AND COALESCE(OLD.approval_status, '') <> 'approved') THEN

    SELECT id INTO v_existing_po_id FROM public.purchase_orders WHERE work_order_id = NEW.id LIMIT 1;
    IF v_existing_po_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;

    v_po_number := 'PO-AUTO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO public.purchase_orders (
      organization_id, po_number, supplier_id, work_order_id,
      status, priority, line_items, subtotal, total_amount, currency,
      notes, created_by
    ) VALUES (
      NEW.organization_id,
      v_po_number,
      NULL,                       -- vendor_id ≠ supplier_profiles.id; left for procurement to attach
      NEW.id,
      'draft',
      COALESCE(NEW.priority, 'normal'),
      jsonb_build_array(jsonb_build_object(
        'description', COALESCE(NEW.service_description, 'Auto-generated for work order'),
        'quantity', 1,
        'unit_price', 0,
        'total', 0
      )),
      0, 0, 'ETB',
      'Auto-generated zero-birr PO from approved work order ' || NEW.work_order_number ||
        COALESCE(' · vendor: ' || v_vendor_name, '') ||
        COALESCE(' / ' || NEW.supplier_name, ''),
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$;