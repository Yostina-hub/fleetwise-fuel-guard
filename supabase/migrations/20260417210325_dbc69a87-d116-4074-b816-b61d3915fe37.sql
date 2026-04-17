CREATE TABLE public.tire_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  requested_by_role TEXT,
  request_type TEXT NOT NULL DEFAULT 'replacement',
  priority TEXT NOT NULL DEFAULT 'normal',
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(12,2),
  documents TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tire_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.tire_requests(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  previous_tire_id UUID REFERENCES public.tire_inventory(id) ON DELETE SET NULL,
  new_tire_id UUID REFERENCES public.tire_inventory(id) ON DELETE SET NULL,
  tire_size TEXT,
  preferred_brand TEXT,
  preferred_model TEXT,
  iproc_return_status TEXT NOT NULL DEFAULT 'pending',
  iproc_return_reference TEXT,
  iproc_returned_at TIMESTAMPTZ,
  iproc_warehouse TEXT,
  iproc_received_by TEXT,
  return_skip_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tire_requests_org ON public.tire_requests(organization_id);
CREATE INDEX idx_tire_requests_vehicle ON public.tire_requests(vehicle_id);
CREATE INDEX idx_tire_requests_status ON public.tire_requests(status);
CREATE INDEX idx_tire_request_items_request ON public.tire_request_items(request_id);
CREATE INDEX idx_tire_request_items_prev_tire ON public.tire_request_items(previous_tire_id);
CREATE INDEX idx_tire_request_items_iproc_status ON public.tire_request_items(iproc_return_status);

ALTER TABLE public.tire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tire requests"
ON public.tire_requests FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can create tire requests"
ON public.tire_requests FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can update tire requests"
ON public.tire_requests FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can delete tire requests"
ON public.tire_requests FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can view tire request items"
ON public.tire_request_items FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can create tire request items"
ON public.tire_request_items FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can update tire request items"
ON public.tire_request_items FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can delete tire request items"
ON public.tire_request_items FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_tire_requests_updated_at
BEFORE UPDATE ON public.tire_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tire_request_items_updated_at
BEFORE UPDATE ON public.tire_request_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_tire_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_date TEXT;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    v_date := to_char(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.tire_requests
    WHERE organization_id = NEW.organization_id
      AND created_at::date = CURRENT_DATE;
    NEW.request_number := 'TRQ-' || v_date || '-' || lpad(v_count::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tire_requests_number
BEFORE INSERT ON public.tire_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_tire_request_number();

CREATE OR REPLACE FUNCTION public.link_previous_tire_for_request_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id UUID;
  v_prev_tire UUID;
BEGIN
  IF NEW.previous_tire_id IS NULL THEN
    SELECT vehicle_id INTO v_vehicle_id FROM public.tire_requests WHERE id = NEW.request_id;
    IF v_vehicle_id IS NOT NULL THEN
      SELECT tire_id INTO v_prev_tire
      FROM public.vehicle_tires
      WHERE vehicle_id = v_vehicle_id
        AND position = NEW.position
        AND (removed_at IS NULL)
      ORDER BY installed_at DESC NULLS LAST
      LIMIT 1;
      NEW.previous_tire_id := v_prev_tire;
      IF v_prev_tire IS NULL THEN
        NEW.iproc_return_status := 'not_required';
        NEW.return_skip_reason := COALESCE(NEW.return_skip_reason, 'First install — no previous tire');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tire_request_items_link_prev
BEFORE INSERT ON public.tire_request_items
FOR EACH ROW EXECUTE FUNCTION public.link_previous_tire_for_request_item();

CREATE OR REPLACE FUNCTION public.enforce_tire_request_approval_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending INT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    SELECT COUNT(*) INTO v_pending
    FROM public.tire_request_items
    WHERE request_id = NEW.id
      AND iproc_return_status NOT IN ('returned', 'not_required');
    IF v_pending > 0 THEN
      RAISE EXCEPTION 'Cannot approve: % item(s) still awaiting old tire return confirmation from iPROC warehouse.', v_pending
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tire_requests_approval_block
BEFORE UPDATE ON public.tire_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_tire_request_approval_block();