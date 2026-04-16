CREATE OR REPLACE FUNCTION public.create_auto_po_from_work_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  po_number TEXT;
BEGIN
  IF NEW.approval_status = 'approved' AND (TG_OP = 'INSERT' OR OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    IF EXISTS (SELECT 1 FROM public.purchase_orders WHERE work_order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    po_number := 'PO-AUTO-' || EXTRACT(EPOCH FROM now())::bigint::text;

    INSERT INTO public.purchase_orders (
      organization_id, work_order_id, po_number, status,
      total_amount, currency, line_items, notes
    ) VALUES (
      NEW.organization_id, NEW.id, po_number, 'approved',
      0, 'ETB',
      jsonb_build_array(jsonb_build_object(
        'description', COALESCE(NEW.service_description, 'Maintenance service per work order'),
        'quantity', 1,
        'unit_price', 0,
        'total', 0,
        'supplier', NEW.supplier_name
      )),
      'Auto-generated zero-Birr / qty=1 PO for approved work order ' || NEW.work_order_number ||
      CASE WHEN NEW.supplier_name IS NOT NULL THEN ' (Supplier: ' || NEW.supplier_name || ')' ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$function$;