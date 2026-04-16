-- 1. Add missing columns to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS vehicle_delivered_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS vehicle_delivered_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS geofence_verified_delivery boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicle_received_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS vehicle_received_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS vehicle_received_by uuid,
  ADD COLUMN IF NOT EXISTS geofence_verified_receipt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pdr_number text,
  ADD COLUMN IF NOT EXISTS po_id uuid,
  ADD COLUMN IF NOT EXISTS sourcing_status text,
  ADD COLUMN IF NOT EXISTS assigned_to_role text,
  ADD COLUMN IF NOT EXISTS supplier_geofence_id uuid REFERENCES public.geofences(id);

-- 2. Workflow events audit trail
CREATE TABLE IF NOT EXISTS public.maintenance_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  step_number text,
  from_stage text,
  to_stage text NOT NULL,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mwe_request ON public.maintenance_workflow_events(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mwe_org ON public.maintenance_workflow_events(organization_id, created_at DESC);

ALTER TABLE public.maintenance_workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mwe_select ON public.maintenance_workflow_events;
CREATE POLICY mwe_select ON public.maintenance_workflow_events FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS mwe_insert ON public.maintenance_workflow_events;
CREATE POLICY mwe_insert ON public.maintenance_workflow_events FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Helper: log workflow event
CREATE OR REPLACE FUNCTION public.log_maintenance_workflow_event(
  p_request_id uuid,
  p_step text,
  p_from text,
  p_to text,
  p_action text,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_org uuid;
  v_role text;
  v_name text;
BEGIN
  SELECT organization_id INTO v_org FROM public.maintenance_requests WHERE id = p_request_id;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  SELECT COALESCE(full_name, email) INTO v_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.maintenance_workflow_events (
    organization_id, request_id, step_number, from_stage, to_stage,
    actor_id, actor_name, actor_role, action, notes, metadata
  ) VALUES (
    v_org, p_request_id, p_step, p_from, p_to,
    auth.uid(), v_name, v_role, p_action, p_notes, p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 4. Geofence verification (haversine within radius)
CREATE OR REPLACE FUNCTION public.verify_vehicle_at_supplier(
  p_request_id uuid,
  p_default_radius_m integer DEFAULT 200
) RETURNS TABLE(verified boolean, distance_m numeric, vehicle_lat numeric, vehicle_lng numeric, geofence_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_geo RECORD;
  v_tel RECORD;
  v_dist numeric;
  v_radius integer;
BEGIN
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;
  IF v_req.supplier_geofence_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::numeric, NULL::numeric, NULL::numeric, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_geo FROM public.geofences WHERE id = v_req.supplier_geofence_id;
  SELECT latitude, longitude INTO v_tel FROM public.vehicle_telemetry
    WHERE vehicle_id = v_req.vehicle_id
    ORDER BY last_communication_at DESC LIMIT 1;

  IF v_tel.latitude IS NULL OR v_geo.center_lat IS NULL THEN
    RETURN QUERY SELECT false, NULL::numeric, v_tel.latitude, v_tel.longitude, v_geo.name;
    RETURN;
  END IF;

  v_radius := COALESCE(v_geo.radius_meters, p_default_radius_m);

  -- Haversine distance in meters
  v_dist := 6371000 * 2 * asin(sqrt(
    power(sin(radians((v_tel.latitude - v_geo.center_lat) / 2)), 2) +
    cos(radians(v_geo.center_lat)) * cos(radians(v_tel.latitude)) *
    power(sin(radians((v_tel.longitude - v_geo.center_lng) / 2)), 2)
  ));

  RETURN QUERY SELECT (v_dist <= v_radius), v_dist, v_tel.latitude, v_tel.longitude, v_geo.name;
END;
$$;

-- 5. Driver confirms vehicle delivered to supplier (Step 6b)
CREATE OR REPLACE FUNCTION public.driver_confirm_vehicle_delivered(
  p_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_check RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  SELECT * INTO v_check FROM public.verify_vehicle_at_supplier(p_request_id) LIMIT 1;

  UPDATE public.maintenance_requests SET
    vehicle_delivered_at = now(),
    vehicle_delivered_by = auth.uid()::text,
    vehicle_delivered_lat = v_check.vehicle_lat,
    vehicle_delivered_lng = v_check.vehicle_lng,
    geofence_verified_delivery = COALESCE(v_check.verified, false),
    workflow_stage = 'supplier_maintenance',
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '6b', v_req.workflow_stage, 'supplier_maintenance',
    'driver_delivered_vehicle', p_notes,
    jsonb_build_object('geofence_verified', v_check.verified, 'distance_m', v_check.distance_m,
                       'lat', v_check.vehicle_lat, 'lng', v_check.vehicle_lng)
  );

  RETURN jsonb_build_object('verified', v_check.verified, 'distance_m', v_check.distance_m);
END;
$$;

-- 6. Driver confirms vehicle received back (Step 23/27)
CREATE OR REPLACE FUNCTION public.driver_confirm_vehicle_received(
  p_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_tel RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  SELECT latitude, longitude INTO v_tel FROM public.vehicle_telemetry
    WHERE vehicle_id = v_req.vehicle_id
    ORDER BY last_communication_at DESC LIMIT 1;

  UPDATE public.maintenance_requests SET
    vehicle_received_at = now(),
    vehicle_received_by = auth.uid(),
    vehicle_received_lat = v_tel.latitude,
    vehicle_received_lng = v_tel.longitude,
    geofence_verified_receipt = true, -- driver confirmation; geofence away from supplier
    workflow_stage = 'vehicle_received',
    status = 'completed',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '23', v_req.workflow_stage, 'vehicle_received',
    'driver_received_vehicle', p_notes,
    jsonb_build_object('lat', v_tel.latitude, 'lng', v_tel.longitude)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Fleet Ops review (Step 2/3)
CREATE OR REPLACE FUNCTION public.fleet_ops_review_request(
  p_request_id uuid,
  p_decision text, -- 'forward' | 'reject'
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_to text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  IF p_decision = 'reject' THEN
    v_to := 'rejected';
    UPDATE public.maintenance_requests SET workflow_stage = v_to, status = 'rejected',
      rejection_reason = p_notes, updated_at = now() WHERE id = p_request_id;
  ELSE
    v_to := 'pre_inspection';
    UPDATE public.maintenance_requests SET workflow_stage = v_to,
      assigned_to_role = 'maintenance_lead', updated_at = now() WHERE id = p_request_id;
  END IF;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '2', v_req.workflow_stage, v_to,
    'fleet_ops_' || p_decision, p_notes
  );
END;
$$;

-- 8. Maintenance pre-inspection (Step 4)
CREATE OR REPLACE FUNCTION public.maintenance_pre_inspection(
  p_request_id uuid,
  p_needs_maintenance boolean,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_to text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  v_to := CASE WHEN p_needs_maintenance THEN 'wo_preparation' ELSE 'no_maintenance' END;

  UPDATE public.maintenance_requests SET
    pre_inspection_done = true,
    pre_inspection_by = (SELECT COALESCE(full_name, email) FROM public.profiles WHERE id = auth.uid()),
    pre_inspection_at = now(),
    pre_inspection_notes = p_notes,
    needs_maintenance = p_needs_maintenance,
    workflow_stage = v_to,
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '4', v_req.workflow_stage, v_to,
    CASE WHEN p_needs_maintenance THEN 'pre_inspection_needs_repair' ELSE 'pre_inspection_no_repair' END,
    p_notes
  );
END;
$$;

-- 9. Maintenance creates PDR (Step 6)
CREATE OR REPLACE FUNCTION public.maintenance_create_pdr(
  p_request_id uuid,
  p_pdr_number text,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  UPDATE public.maintenance_requests SET
    pdr_number = p_pdr_number,
    workflow_stage = 'approved',
    sourcing_status = 'pending_po',
    assigned_to_role = 'procurement',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '6', v_req.workflow_stage, 'approved',
    'pdr_created', p_notes, jsonb_build_object('pdr_number', p_pdr_number)
  );
END;
$$;

-- 10. SCD creates PO (Step 6c)
CREATE OR REPLACE FUNCTION public.scd_create_po(
  p_request_id uuid,
  p_po_id uuid,
  p_supplier_id text,
  p_supplier_name text,
  p_supplier_geofence_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  UPDATE public.maintenance_requests SET
    po_id = p_po_id,
    supplier_id = p_supplier_id,
    supplier_name = p_supplier_name,
    supplier_geofence_id = p_supplier_geofence_id,
    workflow_stage = 'vehicle_delivery',
    sourcing_status = 'po_issued',
    assigned_to_role = 'driver',
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '6c', v_req.workflow_stage, 'vehicle_delivery',
    'po_issued', p_notes,
    jsonb_build_object('po_id', p_po_id, 'supplier', p_supplier_name)
  );
END;
$$;

-- 11. Inspector post-inspection (Step 15)
CREATE OR REPLACE FUNCTION public.inspector_post_inspection(
  p_request_id uuid,
  p_result text, -- 'pass' | 'fail'
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_to text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  v_to := CASE WHEN p_result = 'pass' THEN 'payment_pending' ELSE 'correction_required' END;

  UPDATE public.maintenance_requests SET
    post_inspection_result = p_result,
    post_inspection_at = now(),
    post_inspection_notes = p_notes,
    maintenance_accepted = (p_result = 'pass'),
    maintenance_accepted_at = CASE WHEN p_result = 'pass' THEN now() ELSE NULL END,
    maintenance_accepted_by = (SELECT COALESCE(full_name, email) FROM public.profiles WHERE id = auth.uid()),
    workflow_stage = v_to,
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '15', v_req.workflow_stage, v_to,
    'post_inspection_' || p_result, p_notes
  );
END;
$$;

-- 12. Delivery check decision (Step 28)
CREATE OR REPLACE FUNCTION public.delivery_check_decision(
  p_request_id uuid,
  p_acceptable boolean,
  p_document_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_to text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_req FROM public.maintenance_requests WHERE id = p_request_id;

  v_to := CASE WHEN p_acceptable THEN 'vehicle_received' ELSE 'correction_required' END;

  UPDATE public.maintenance_requests SET
    delivery_acceptable = p_acceptable,
    delivery_checked_at = now(),
    delivery_document_url = COALESCE(p_document_url, delivery_document_url),
    workflow_stage = v_to,
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_maintenance_workflow_event(
    p_request_id, '28', v_req.workflow_stage, v_to,
    CASE WHEN p_acceptable THEN 'delivery_accepted' ELSE 'delivery_rejected' END,
    p_notes
  );
END;
$$;

-- 13. Initial submitted event auto-logged via trigger
CREATE OR REPLACE FUNCTION public.trg_log_maintenance_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_name text; v_role text;
BEGIN
  SELECT COALESCE(full_name, email) INTO v_name FROM public.profiles WHERE id = NEW.requested_by;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = NEW.requested_by LIMIT 1;

  INSERT INTO public.maintenance_workflow_events (
    organization_id, request_id, step_number, from_stage, to_stage,
    actor_id, actor_name, actor_role, action, notes
  ) VALUES (
    NEW.organization_id, NEW.id, '1', NULL, COALESCE(NEW.workflow_stage, 'submitted'),
    NEW.requested_by, v_name, v_role, 'request_submitted', NEW.description
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mr_created ON public.maintenance_requests;
CREATE TRIGGER trg_mr_created AFTER INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_log_maintenance_request_created();