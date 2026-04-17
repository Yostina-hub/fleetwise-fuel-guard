-- ============================================================
-- Comfort & Safety Material Request System
-- ============================================================

CREATE TABLE public.safety_comfort_request_eligibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('role','user','vehicle_group')),
  scope_value TEXT NOT NULL,
  item_key TEXT NOT NULL,
  max_qty_per_period INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, scope_type, scope_value, item_key)
);
CREATE INDEX idx_sc_eligibility_org ON public.safety_comfort_request_eligibility(organization_id);
CREATE INDEX idx_sc_eligibility_lookup ON public.safety_comfort_request_eligibility(organization_id, scope_type, scope_value, item_key) WHERE is_active = TRUE;

CREATE TABLE public.safety_comfort_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL UNIQUE,
  requester_id UUID NOT NULL,
  requester_name TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_group TEXT,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','under_review','approved','rejected','pending_stock','fulfilled','cancelled'
  )),
  eligibility_check TEXT,
  eligibility_notes TEXT,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  approval_comments TEXT,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  warehouse_checked_by UUID,
  warehouse_checked_at TIMESTAMPTZ,
  stock_status TEXT,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  procurement_request_id UUID,
  total_estimated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_req_org ON public.safety_comfort_requests(organization_id);
CREATE INDEX idx_sc_req_requester ON public.safety_comfort_requests(requester_id);
CREATE INDEX idx_sc_req_status ON public.safety_comfort_requests(organization_id, status);
CREATE INDEX idx_sc_req_vehicle ON public.safety_comfort_requests(vehicle_id);

CREATE TABLE public.safety_comfort_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.safety_comfort_requests(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  category TEXT NOT NULL,
  requested_qty NUMERIC NOT NULL DEFAULT 1,
  required_qty TEXT,
  usability_period TEXT,
  reason_for_replacement TEXT,
  last_issued_at TIMESTAMPTZ,
  usability_check_passed BOOLEAN,
  usability_check_message TEXT,
  approved_qty NUMERIC,
  line_status TEXT NOT NULL DEFAULT 'pending' CHECK (line_status IN (
    'pending','approved','rejected','in_stock','out_of_stock','issued','cancelled'
  )),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  available_qty NUMERIC,
  unit_cost NUMERIC,
  estimated_cost NUMERIC,
  issued_qty NUMERIC,
  issued_at TIMESTAMPTZ,
  issued_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_req_items_request ON public.safety_comfort_request_items(request_id);
CREATE INDEX idx_sc_req_items_item ON public.safety_comfort_request_items(organization_id, item_key);

CREATE TABLE public.safety_comfort_issuances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.safety_comfort_requests(id) ON DELETE SET NULL,
  request_item_id UUID REFERENCES public.safety_comfort_request_items(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  source TEXT NOT NULL DEFAULT 'warehouse' CHECK (source IN ('warehouse','procurement','direct')),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  issued_by UUID,
  issued_by_name TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_issue_user_item ON public.safety_comfort_issuances(user_id, item_key, issued_at DESC);
CREATE INDEX idx_sc_issue_vehicle_item ON public.safety_comfort_issuances(vehicle_id, item_key, issued_at DESC);
CREATE INDEX idx_sc_issue_org ON public.safety_comfort_issuances(organization_id);

CREATE TABLE public.safety_comfort_procurement_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pr_number TEXT NOT NULL UNIQUE,
  request_id UUID REFERENCES public.safety_comfort_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','sourcing','quoted','po_issued','received','closed','cancelled'
  )),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_estimated_cost NUMERIC DEFAULT 0,
  expected_delivery_date DATE,
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_pr_org_status ON public.safety_comfort_procurement_requests(organization_id, status);
CREATE INDEX idx_sc_pr_request ON public.safety_comfort_procurement_requests(request_id);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_safety_comfort_request_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq INTEGER;
  v_yyyymm TEXT;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    v_yyyymm := to_char(now(), 'YYYYMM');
    SELECT COALESCE(MAX(CAST(split_part(request_number, '-', 3) AS INTEGER)), 0) + 1
      INTO v_seq
      FROM public.safety_comfort_requests
      WHERE request_number LIKE 'SCR-' || v_yyyymm || '-%'
        AND organization_id = NEW.organization_id;
    NEW.request_number := 'SCR-' || v_yyyymm || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sc_request_number
BEFORE INSERT ON public.safety_comfort_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_safety_comfort_request_number();

CREATE OR REPLACE FUNCTION public.generate_safety_comfort_pr_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq INTEGER;
  v_yyyymm TEXT;
BEGIN
  IF NEW.pr_number IS NULL OR NEW.pr_number = '' THEN
    v_yyyymm := to_char(now(), 'YYYYMM');
    SELECT COALESCE(MAX(CAST(split_part(pr_number, '-', 3) AS INTEGER)), 0) + 1
      INTO v_seq
      FROM public.safety_comfort_procurement_requests
      WHERE pr_number LIKE 'SCPR-' || v_yyyymm || '-%'
        AND organization_id = NEW.organization_id;
    NEW.pr_number := 'SCPR-' || v_yyyymm || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sc_pr_number
BEFORE INSERT ON public.safety_comfort_procurement_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_safety_comfort_pr_number();

CREATE TRIGGER trg_sc_req_updated BEFORE UPDATE ON public.safety_comfort_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sc_req_items_updated BEFORE UPDATE ON public.safety_comfort_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sc_eligibility_updated BEFORE UPDATE ON public.safety_comfort_request_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sc_pr_updated BEFORE UPDATE ON public.safety_comfort_procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_safety_comfort_usability(
  p_user_id UUID,
  p_vehicle_id UUID,
  p_item_key TEXT,
  p_period_days INTEGER DEFAULT 365
)
RETURNS TABLE (
  allowed BOOLEAN,
  last_issued_at TIMESTAMPTZ,
  days_since_last INTEGER,
  reason TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last TIMESTAMPTZ;
BEGIN
  SELECT MAX(issued_at) INTO v_last
    FROM public.safety_comfort_issuances
    WHERE item_key = p_item_key
      AND (user_id = p_user_id OR (p_vehicle_id IS NOT NULL AND vehicle_id = p_vehicle_id));

  IF v_last IS NULL THEN
    RETURN QUERY SELECT TRUE, NULL::TIMESTAMPTZ, NULL::INTEGER,
      'No prior issuance — eligible.'::TEXT;
    RETURN;
  END IF;

  IF (now() - v_last) >= make_interval(days => p_period_days) THEN
    RETURN QUERY SELECT TRUE, v_last,
      EXTRACT(DAY FROM now() - v_last)::INTEGER,
      'Usability period elapsed.'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, v_last,
      EXTRACT(DAY FROM now() - v_last)::INTEGER,
      ('Blocked: last issued ' || EXTRACT(DAY FROM now() - v_last)::INTEGER ||
       ' day(s) ago — usability period (' || p_period_days || ' days) not elapsed.')::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_safety_comfort_allowed_items(
  p_user_id UUID,
  p_vehicle_id UUID
)
RETURNS TABLE (item_key TEXT, source TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
  v_group TEXT;
BEGIN
  SELECT organization_id, vehicle_group INTO v_org, v_group
    FROM public.vehicles WHERE id = p_vehicle_id;

  IF v_org IS NULL THEN
    v_org := public.get_user_organization(p_user_id);
  END IF;

  RETURN QUERY
    SELECT e.item_key, ('group:' || e.scope_value)::TEXT AS source
      FROM public.safety_comfort_request_eligibility e
      WHERE e.organization_id = v_org
        AND e.is_active = TRUE
        AND e.scope_type = 'vehicle_group'
        AND e.scope_value = COALESCE(v_group, 'group_one')
    UNION
    SELECT e.item_key, ('role:' || e.scope_value)::TEXT
      FROM public.safety_comfort_request_eligibility e
      JOIN public.user_roles ur
        ON ur.user_id = p_user_id AND ur.role::text = e.scope_value
      WHERE e.organization_id = v_org
        AND e.is_active = TRUE
        AND e.scope_type = 'role'
    UNION
    SELECT e.item_key, 'user'::TEXT
      FROM public.safety_comfort_request_eligibility e
      WHERE e.organization_id = v_org
        AND e.is_active = TRUE
        AND e.scope_type = 'user'
        AND e.scope_value = p_user_id::text;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.safety_comfort_request_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_comfort_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_comfort_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_comfort_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_comfort_procurement_requests ENABLE ROW LEVEL SECURITY;

-- Eligibility allowlist
CREATE POLICY "sc_eligibility_select_org" ON public.safety_comfort_request_eligibility
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "sc_eligibility_admin_write" ON public.safety_comfort_request_eligibility
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid())
         AND (public.has_role(auth.uid(), 'org_admin'::app_role)
              OR public.has_role(auth.uid(), 'super_admin'::app_role)
              OR public.has_role(auth.uid(), 'fleet_manager'::app_role)))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid())
         AND (public.has_role(auth.uid(), 'org_admin'::app_role)
              OR public.has_role(auth.uid(), 'super_admin'::app_role)
              OR public.has_role(auth.uid(), 'fleet_manager'::app_role)));

-- Requests
CREATE POLICY "sc_requests_select" ON public.safety_comfort_requests
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      requester_id = auth.uid()
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );
CREATE POLICY "sc_requests_insert_own" ON public.safety_comfort_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND requester_id = auth.uid()
  );
CREATE POLICY "sc_requests_update" ON public.safety_comfort_requests
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      (requester_id = auth.uid() AND status IN ('submitted','under_review'))
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );

-- Request items
CREATE POLICY "sc_req_items_select" ON public.safety_comfort_request_items
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.safety_comfort_requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.has_role(auth.uid(), 'org_admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
          OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
          OR public.has_role(auth.uid(), 'operations_manager'::app_role)
          OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
        )
    )
  );
CREATE POLICY "sc_req_items_insert" ON public.safety_comfort_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.safety_comfort_requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.has_role(auth.uid(), 'org_admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
          OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
        )
    )
  );
CREATE POLICY "sc_req_items_update" ON public.safety_comfort_request_items
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );

-- Issuances
CREATE POLICY "sc_issuances_select" ON public.safety_comfort_issuances
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );
CREATE POLICY "sc_issuances_insert" ON public.safety_comfort_issuances
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );

-- Procurement requests
CREATE POLICY "sc_pr_select" ON public.safety_comfort_procurement_requests
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
      OR public.has_role(auth.uid(), 'mechanic'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.safety_comfort_requests r
        WHERE r.id = request_id AND r.requester_id = auth.uid()
      )
    )
  );
CREATE POLICY "sc_pr_write" ON public.safety_comfort_procurement_requests
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );