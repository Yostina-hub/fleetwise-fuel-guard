-- ============================================================
-- STEP 6: Fuel Work Order approval via delegation matrix
-- ============================================================

-- Approval steps for fuel work orders (mirrors fuel_request_approvals)
CREATE TABLE IF NOT EXISTS public.fuel_wo_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fuel_work_order_id UUID NOT NULL REFERENCES public.fuel_work_orders(id) ON DELETE CASCADE,
  step INT NOT NULL,
  approver_id UUID,                       -- effective approver (may be a delegate)
  original_approver_id UUID,              -- delegator (when delegated)
  approver_role TEXT NOT NULL,
  is_delegated BOOLEAN DEFAULT false,
  action TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|skipped
  comment TEXT,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_wo_approvals_wo ON public.fuel_wo_approvals(fuel_work_order_id);
CREATE INDEX IF NOT EXISTS idx_fuel_wo_approvals_pending ON public.fuel_wo_approvals(approver_id, action) WHERE action='pending';

ALTER TABLE public.fuel_wo_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_wo_approvals_org_select" ON public.fuel_wo_approvals;
CREATE POLICY "fuel_wo_approvals_org_select" ON public.fuel_wo_approvals
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "fuel_wo_approvals_org_modify" ON public.fuel_wo_approvals;
CREATE POLICY "fuel_wo_approvals_org_modify" ON public.fuel_wo_approvals
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_fuel_wo_approvals_updated
  BEFORE UPDATE ON public.fuel_wo_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WO approval extra columns
ALTER TABLE public.fuel_work_orders 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending', -- pending|approved|rejected
  ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_approved_by UUID;

-- Route a WO to an approval chain (cost-based + delegation aware)
CREATE OR REPLACE FUNCTION public.route_fuel_wo_approval(p_wo_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo RECORD;
  v_amount NUMERIC;
  v_step INT := 1;
  v_user_id UUID;
  v_delegate UUID;
BEGIN
  SELECT * INTO v_wo FROM public.fuel_work_orders WHERE id = p_wo_id;
  IF v_wo IS NULL THEN RAISE EXCEPTION 'Fuel work order not found'; END IF;

  v_amount := COALESCE(v_wo.emoney_amount, 0);

  -- Clear existing pending steps
  DELETE FROM public.fuel_wo_approvals WHERE fuel_work_order_id = p_wo_id AND action='pending';

  -- Step 1: fleet_manager always required
  SELECT user_id INTO v_user_id
  FROM public.user_roles
  WHERE organization_id = v_wo.organization_id AND role::text = 'fleet_manager'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    v_delegate := public.get_active_delegate(v_user_id, 'approvals', v_amount);
    INSERT INTO public.fuel_wo_approvals (
      organization_id, fuel_work_order_id, step, approver_id,
      original_approver_id, approver_role, is_delegated
    ) VALUES (
      v_wo.organization_id, p_wo_id, v_step, COALESCE(v_delegate, v_user_id),
      CASE WHEN v_delegate IS NOT NULL THEN v_user_id ELSE NULL END,
      'fleet_manager', v_delegate IS NOT NULL
    );
    v_step := v_step + 1;
  END IF;

  -- Step 2 (escalation): operations_manager when amount > 10000 ETB
  IF v_amount > 10000 THEN
    SELECT user_id INTO v_user_id
    FROM public.user_roles
    WHERE organization_id = v_wo.organization_id AND role::text = 'operations_manager'
    LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      v_delegate := public.get_active_delegate(v_user_id, 'approvals', v_amount);
      INSERT INTO public.fuel_wo_approvals (
        organization_id, fuel_work_order_id, step, approver_id,
        original_approver_id, approver_role, is_delegated
      ) VALUES (
        v_wo.organization_id, p_wo_id, v_step, COALESCE(v_delegate, v_user_id),
        CASE WHEN v_delegate IS NOT NULL THEN v_user_id ELSE NULL END,
        'operations_manager', v_delegate IS NOT NULL
      );
    END IF;
  END IF;

  UPDATE public.fuel_work_orders
  SET approval_status = 'pending', updated_at = now()
  WHERE id = p_wo_id;

  RETURN 'routed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.route_fuel_wo_approval(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.route_fuel_wo_approval(UUID) TO authenticated;

-- Auto-route after fuel WO is created (from FR approval trigger)
CREATE OR REPLACE FUNCTION public.auto_route_fuel_wo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.route_fuel_wo_approval(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_route_fuel_wo ON public.fuel_work_orders;
CREATE TRIGGER trg_auto_route_fuel_wo
  AFTER INSERT ON public.fuel_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_route_fuel_wo();

-- Action a fuel WO approval step
CREATE OR REPLACE FUNCTION public.action_fuel_wo_approval(
  p_approval_id UUID, p_action TEXT, p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step RECORD;
  v_remaining INT;
  v_final TEXT := 'in_progress';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_action NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid action'; END IF;

  SELECT * INTO v_step FROM public.fuel_wo_approvals WHERE id = p_approval_id;
  IF v_step IS NULL THEN RAISE EXCEPTION 'Approval step not found'; END IF;
  IF v_step.action <> 'pending' THEN RAISE EXCEPTION 'Already actioned'; END IF;
  IF v_step.approver_id <> auth.uid() THEN RAISE EXCEPTION 'Not assigned to this user'; END IF;

  UPDATE public.fuel_wo_approvals SET
    action = p_action, comment = p_comment, acted_at = now(), updated_at = now()
  WHERE id = p_approval_id;

  IF p_action = 'rejected' THEN
    UPDATE public.fuel_work_orders
    SET approval_status='rejected', status='cancelled', updated_at=now()
    WHERE id = v_step.fuel_work_order_id;
    v_final := 'rejected';
  ELSE
    SELECT COUNT(*) INTO v_remaining
    FROM public.fuel_wo_approvals
    WHERE fuel_work_order_id = v_step.fuel_work_order_id AND action = 'pending';
    IF v_remaining = 0 THEN
      UPDATE public.fuel_work_orders SET
        approval_status='approved',
        status='released',
        approved_by = auth.uid(),
        approved_at = now(),
        final_approved_by = auth.uid(),
        final_approved_at = now(),
        updated_at = now()
      WHERE id = v_step.fuel_work_order_id;
      v_final := 'approved';
    END IF;
  END IF;

  RETURN jsonb_build_object('final_status', v_final, 'remaining_steps', COALESCE(v_remaining, 0));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.action_fuel_wo_approval(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.action_fuel_wo_approval(UUID, TEXT, TEXT) TO authenticated;

-- List my pending WO approvals
CREATE OR REPLACE FUNCTION public.get_my_pending_fuel_wo_approvals()
RETURNS TABLE (
  approval_id UUID, fuel_work_order_id UUID, work_order_number TEXT,
  request_number TEXT, vehicle_plate TEXT, generator_name TEXT,
  emoney_amount NUMERIC, priority TEXT, step INT, approver_role TEXT,
  is_delegated BOOLEAN, original_approver_name TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, w.id, w.work_order_number,
    fr.request_number, v.plate_number, g.name,
    w.emoney_amount, w.priority, a.step, a.approver_role,
    a.is_delegated, p.full_name, a.created_at
  FROM public.fuel_wo_approvals a
  JOIN public.fuel_work_orders w ON w.id = a.fuel_work_order_id
  LEFT JOIN public.fuel_requests fr ON fr.id = w.fuel_request_id
  LEFT JOIN public.vehicles v ON v.id = fr.vehicle_id
  LEFT JOIN public.generators g ON g.id = fr.generator_id
  LEFT JOIN public.profiles p ON p.id = a.original_approver_id
  WHERE a.action='pending'
    AND a.approver_id = auth.uid()
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_pending_fuel_wo_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_fuel_wo_approvals() TO authenticated;


-- ============================================================
-- STEP 8: E-money transfer approval via delegation matrix
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fuel_emoney_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fuel_work_order_id UUID NOT NULL REFERENCES public.fuel_work_orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  initiated_by UUID,                  -- site fuel admin who initiated
  approver_id UUID NOT NULL,          -- effective approver
  original_approver_id UUID,
  approver_role TEXT NOT NULL,
  is_delegated BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  comment TEXT,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_emoney_approvals_wo ON public.fuel_emoney_approvals(fuel_work_order_id);
CREATE INDEX IF NOT EXISTS idx_fuel_emoney_approvals_pending ON public.fuel_emoney_approvals(approver_id, status) WHERE status='pending';

ALTER TABLE public.fuel_emoney_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_emoney_approvals_org_select" ON public.fuel_emoney_approvals;
CREATE POLICY "fuel_emoney_approvals_org_select" ON public.fuel_emoney_approvals
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "fuel_emoney_approvals_org_modify" ON public.fuel_emoney_approvals;
CREATE POLICY "fuel_emoney_approvals_org_modify" ON public.fuel_emoney_approvals
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_fuel_emoney_approvals_updated
  BEFORE UPDATE ON public.fuel_emoney_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Initiate e-money request (site fuel admin) -> creates an approval row
CREATE OR REPLACE FUNCTION public.initiate_fuel_emoney_request(
  p_wo_id UUID, p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo RECORD;
  v_user_id UUID;
  v_delegate UUID;
  v_approval_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;

  SELECT * INTO v_wo FROM public.fuel_work_orders WHERE id = p_wo_id;
  IF v_wo IS NULL THEN RAISE EXCEPTION 'Work order not found'; END IF;

  -- Pick approver: ops_manager when > 5000, else fleet_manager
  SELECT user_id INTO v_user_id
  FROM public.user_roles
  WHERE organization_id = v_wo.organization_id
    AND role::text = CASE WHEN p_amount > 5000 THEN 'operations_manager' ELSE 'fleet_manager' END
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Fallback to any fleet_manager
    SELECT user_id INTO v_user_id
    FROM public.user_roles
    WHERE organization_id = v_wo.organization_id AND role::text = 'fleet_manager'
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No approver configured'; END IF;

  v_delegate := public.get_active_delegate(v_user_id, 'approvals', p_amount);

  INSERT INTO public.fuel_emoney_approvals (
    organization_id, fuel_work_order_id, amount, initiated_by,
    approver_id, original_approver_id, approver_role, is_delegated
  ) VALUES (
    v_wo.organization_id, p_wo_id, p_amount, auth.uid(),
    COALESCE(v_delegate, v_user_id),
    CASE WHEN v_delegate IS NOT NULL THEN v_user_id ELSE NULL END,
    CASE WHEN p_amount > 5000 THEN 'operations_manager' ELSE 'fleet_manager' END,
    v_delegate IS NOT NULL
  ) RETURNING id INTO v_approval_id;

  -- Mark WO as awaiting e-money approval
  UPDATE public.fuel_work_orders SET
    emoney_amount = p_amount,
    emoney_transfer_status = 'pending_approval',
    updated_at = now()
  WHERE id = p_wo_id;

  RETURN v_approval_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.initiate_fuel_emoney_request(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initiate_fuel_emoney_request(UUID, NUMERIC) TO authenticated;

-- Approve / reject the e-money request
CREATE OR REPLACE FUNCTION public.action_fuel_emoney_approval(
  p_approval_id UUID, p_action TEXT, p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_action NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid action'; END IF;

  SELECT * INTO v_app FROM public.fuel_emoney_approvals WHERE id = p_approval_id;
  IF v_app IS NULL THEN RAISE EXCEPTION 'Approval not found'; END IF;
  IF v_app.status <> 'pending' THEN RAISE EXCEPTION 'Already actioned'; END IF;
  IF v_app.approver_id <> auth.uid() THEN RAISE EXCEPTION 'Not assigned to this user'; END IF;

  UPDATE public.fuel_emoney_approvals SET
    status = p_action, comment = p_comment, acted_at = now(), updated_at = now()
  WHERE id = p_approval_id;

  IF p_action = 'approved' THEN
    UPDATE public.fuel_work_orders SET
      emoney_approved_by = auth.uid(),
      emoney_approved_at = now(),
      emoney_transfer_status = 'approved',
      updated_at = now()
    WHERE id = v_app.fuel_work_order_id;
  ELSE
    UPDATE public.fuel_work_orders SET
      emoney_transfer_status = 'rejected',
      updated_at = now()
    WHERE id = v_app.fuel_work_order_id;
  END IF;

  RETURN jsonb_build_object('status', p_action, 'wo_id', v_app.fuel_work_order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.action_fuel_emoney_approval(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.action_fuel_emoney_approval(UUID, TEXT, TEXT) TO authenticated;

-- List my pending e-money approvals
CREATE OR REPLACE FUNCTION public.get_my_pending_emoney_approvals()
RETURNS TABLE (
  approval_id UUID, fuel_work_order_id UUID, work_order_number TEXT,
  request_number TEXT, vehicle_plate TEXT, generator_name TEXT,
  amount NUMERIC, driver_phone TEXT, initiated_by_name TEXT,
  approver_role TEXT, is_delegated BOOLEAN, original_approver_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, w.id, w.work_order_number,
    fr.request_number, v.plate_number, g.name,
    a.amount, fr.driver_phone, init.full_name,
    a.approver_role, a.is_delegated, orig.full_name, a.created_at
  FROM public.fuel_emoney_approvals a
  JOIN public.fuel_work_orders w ON w.id = a.fuel_work_order_id
  LEFT JOIN public.fuel_requests fr ON fr.id = w.fuel_request_id
  LEFT JOIN public.vehicles v ON v.id = fr.vehicle_id
  LEFT JOIN public.generators g ON g.id = fr.generator_id
  LEFT JOIN public.profiles init ON init.id = a.initiated_by
  LEFT JOIN public.profiles orig ON orig.id = a.original_approver_id
  WHERE a.status='pending' AND a.approver_id = auth.uid()
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_pending_emoney_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_emoney_approvals() TO authenticated;


-- ============================================================
-- STEP 10: Approved stations with fuel availability + nearest RPC
-- ============================================================

ALTER TABLE public.approved_fuel_stations
  ADD COLUMN IF NOT EXISTS diesel_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS petrol_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS diesel_stock_liters NUMERIC,
  ADD COLUMN IF NOT EXISTS petrol_stock_liters NUMERIC,
  ADD COLUMN IF NOT EXISTS diesel_price_per_liter NUMERIC,
  ADD COLUMN IF NOT EXISTS petrol_price_per_liter NUMERIC,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS hours_of_operation TEXT,
  ADD COLUMN IF NOT EXISTS last_stock_update TIMESTAMPTZ;

-- RPC: list nearby approved stations with availability
CREATE OR REPLACE FUNCTION public.get_nearby_fuel_stations(
  p_lat NUMERIC, p_lng NUMERIC,
  p_max_km NUMERIC DEFAULT 20,
  p_fuel_type TEXT DEFAULT 'diesel',
  p_min_liters NUMERIC DEFAULT 0
)
RETURNS TABLE (
  id UUID, name TEXT, brand TEXT, lat NUMERIC, lng NUMERIC,
  distance_km NUMERIC, diesel_available BOOLEAN, petrol_available BOOLEAN,
  diesel_stock_liters NUMERIC, petrol_stock_liters NUMERIC,
  diesel_price_per_liter NUMERIC, petrol_price_per_liter NUMERIC,
  phone TEXT, hours_of_operation TEXT, last_stock_update TIMESTAMPTZ,
  has_requested_fuel BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org UUID;
BEGIN
  v_org := public.get_user_organization(auth.uid());
  IF v_org IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    s.id, s.name, s.brand, s.lat, s.lng,
    ROUND((6371 * 2 * asin(sqrt(
      power(sin(radians((s.lat - p_lat) / 2)), 2) +
      cos(radians(p_lat)) * cos(radians(s.lat)) *
      power(sin(radians((s.lng - p_lng) / 2)), 2)
    )))::numeric, 2) AS distance_km,
    s.diesel_available, s.petrol_available,
    s.diesel_stock_liters, s.petrol_stock_liters,
    s.diesel_price_per_liter, s.petrol_price_per_liter,
    s.phone, s.hours_of_operation, s.last_stock_update,
    CASE
      WHEN p_fuel_type = 'diesel' THEN COALESCE(s.diesel_available, false) AND COALESCE(s.diesel_stock_liters, 999999) >= p_min_liters
      WHEN p_fuel_type = 'petrol' THEN COALESCE(s.petrol_available, false) AND COALESCE(s.petrol_stock_liters, 999999) >= p_min_liters
      ELSE true
    END AS has_requested_fuel
  FROM public.approved_fuel_stations s
  WHERE s.organization_id = v_org
    AND s.is_active = true
    AND (6371 * 2 * asin(sqrt(
      power(sin(radians((s.lat - p_lat) / 2)), 2) +
      cos(radians(p_lat)) * cos(radians(s.lat)) *
      power(sin(radians((s.lng - p_lng) / 2)), 2)
    ))) <= p_max_km
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_nearby_fuel_stations(NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_fuel_stations(NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC) TO authenticated;


-- ============================================================
-- STEP 11: Auto-create fuel_transaction on FR fulfillment
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_fuel_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing INT;
  v_station RECORD;
BEGIN
  -- Only when transitioning to fulfilled and we have actuals
  IF NEW.status = 'fulfilled'
     AND (OLD.status IS NULL OR OLD.status <> 'fulfilled')
     AND NEW.actual_liters IS NOT NULL
     AND NEW.actual_liters > 0
     AND NEW.vehicle_id IS NOT NULL THEN

    -- Idempotency: skip if a transaction already exists for this FR via notes link
    SELECT COUNT(*) INTO v_existing
    FROM public.fuel_transactions
    WHERE organization_id = NEW.organization_id
      AND vehicle_id = NEW.vehicle_id
      AND notes LIKE 'FR:' || NEW.id::text || '%';
    IF v_existing > 0 THEN RETURN NEW; END IF;

    -- Look up station info if linked
    IF NEW.station_id IS NOT NULL THEN
      SELECT name, lat, lng INTO v_station
      FROM public.approved_fuel_stations
      WHERE id = NEW.station_id;
    END IF;

    INSERT INTO public.fuel_transactions (
      organization_id, vehicle_id, transaction_type, transaction_date,
      fuel_amount_liters, fuel_cost,
      fuel_price_per_liter,
      odometer_km, location_name, lat, lng,
      vendor_name, notes
    ) VALUES (
      NEW.organization_id, NEW.vehicle_id, 'refuel',
      COALESCE(NEW.fulfilled_at, now()),
      NEW.actual_liters, NEW.actual_cost,
      CASE WHEN NEW.actual_cost IS NOT NULL AND NEW.actual_liters > 0
           THEN ROUND((NEW.actual_cost / NEW.actual_liters)::numeric, 2) END,
      NEW.current_odometer,
      v_station.name, v_station.lat, v_station.lng,
      v_station.name,
      'FR:' || NEW.id::text || ' [auto-created from fuel request ' || NEW.request_number || ']'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_fuel_txn ON public.fuel_requests;
CREATE TRIGGER trg_auto_create_fuel_txn
  AFTER UPDATE ON public.fuel_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_fuel_transaction();


-- ============================================================
-- STEP 12: Clarification table + auto-open on deviation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_clarification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fuel_request_id UUID NOT NULL REFERENCES public.fuel_requests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open|answered|closed
  resolution TEXT,                       -- approved|rejected (when closed)
  requested_by UUID,
  justified_by UUID,
  resolved_by UUID,
  auto_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  justified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_clar_fr ON public.fuel_clarification_requests(fuel_request_id);
CREATE INDEX IF NOT EXISTS idx_fuel_clar_status ON public.fuel_clarification_requests(status);

ALTER TABLE public.fuel_clarification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_clar_org_select" ON public.fuel_clarification_requests;
CREATE POLICY "fuel_clar_org_select" ON public.fuel_clarification_requests
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "fuel_clar_org_modify" ON public.fuel_clarification_requests;
CREATE POLICY "fuel_clar_org_modify" ON public.fuel_clarification_requests
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_fuel_clar_updated
  BEFORE UPDATE ON public.fuel_clarification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-open clarification when deviation detected
CREATE OR REPLACE FUNCTION public.auto_open_fuel_clarification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_existing INT;
BEGIN
  IF NEW.clearance_status = 'deviation_detected'
     AND (OLD.clearance_status IS NULL OR OLD.clearance_status <> 'deviation_detected') THEN
    SELECT COUNT(*) INTO v_existing
    FROM public.fuel_clarification_requests
    WHERE fuel_request_id = NEW.id AND status <> 'closed';
    IF v_existing = 0 THEN
      INSERT INTO public.fuel_clarification_requests (
        organization_id, fuel_request_id, question, status, auto_created
      ) VALUES (
        NEW.organization_id, NEW.id,
        format('Auto-flag: Fuel deviation of %s%% detected (approved %s L vs actual %s L). Justification required.',
               COALESCE(NEW.deviation_percent::text, '?'),
               COALESCE(NEW.liters_approved::text, '?'),
               COALESCE(NEW.actual_liters::text, '?')),
        'open', true
      );
      UPDATE public.fuel_requests SET clarification_status = 'requested' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_open_fuel_clarification ON public.fuel_requests;
CREATE TRIGGER trg_auto_open_fuel_clarification
  AFTER UPDATE ON public.fuel_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_open_fuel_clarification();