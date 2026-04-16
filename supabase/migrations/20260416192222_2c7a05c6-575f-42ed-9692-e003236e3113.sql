
-- Step 7: Supplier acknowledges PO and starts work
CREATE OR REPLACE FUNCTION public.supplier_acknowledge_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE public.maintenance_requests SET
    workflow_stage = 'supplier_maintenance',
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '7', v_req.workflow_stage, 'supplier_maintenance',
    'supplier_started_work', p_notes
  );
END;
$$;

-- Step 8: Supplier requests variation (scope/cost change)
CREATE OR REPLACE FUNCTION public.supplier_request_variation(
  p_request_id uuid,
  p_variation_notes text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  UPDATE public.maintenance_requests SET
    variation_requested = true,
    variation_notes = p_variation_notes,
    workflow_stage = 'variation_review',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '8', v_req.workflow_stage, 'variation_review',
    'supplier_requested_variation', p_variation_notes
  );
END;
$$;

-- Step 9: Supplier completes maintenance work
CREATE OR REPLACE FUNCTION public.supplier_complete_work(
  p_request_id uuid,
  p_invoice_url text DEFAULT NULL,
  p_report_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  UPDATE public.maintenance_requests SET
    workflow_stage = 'inspector_assigned',
    supplier_invoice_url = COALESCE(p_invoice_url, supplier_invoice_url),
    supplier_report_url = COALESCE(p_report_url, supplier_report_url),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '9', v_req.workflow_stage, 'inspector_assigned',
    'supplier_completed_work', p_notes,
    jsonb_build_object('invoice_url', p_invoice_url, 'report_url', p_report_url)
  );
END;
$$;

-- Step 22: Supplier marks vehicle ready / delivered back to fleet
CREATE OR REPLACE FUNCTION public.supplier_mark_delivered_back(
  p_request_id uuid,
  p_document_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  UPDATE public.maintenance_requests SET
    workflow_stage = 'delivery_check',
    delivery_document_url = COALESCE(p_document_url, delivery_document_url),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '22', v_req.workflow_stage, 'delivery_check',
    'supplier_marked_delivered', p_notes,
    jsonb_build_object('document_url', p_document_url)
  );
END;
$$;
