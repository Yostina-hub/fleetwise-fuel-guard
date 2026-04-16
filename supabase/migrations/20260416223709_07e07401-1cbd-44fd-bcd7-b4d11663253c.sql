
-- =========================================================================
-- 1. PRICE CATALOGS (per org, optional zone)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.outsource_price_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalog_name text NOT NULL,
  zone_region text,
  resource_type text NOT NULL CHECK (resource_type IN ('vehicle','driver','combined')),
  vehicle_class text,
  driver_grade text,
  unit text NOT NULL DEFAULT 'day' CHECK (unit IN ('hour','day','week','month','km','trip')),
  base_rate numeric(12,2) NOT NULL DEFAULT 0,
  overtime_rate numeric(12,2),
  fuel_included boolean NOT NULL DEFAULT false,
  driver_included boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'ETB',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opc_org ON public.outsource_price_catalogs(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_opc_zone ON public.outsource_price_catalogs(organization_id, zone_region);

ALTER TABLE public.outsource_price_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_opc" ON public.outsource_price_catalogs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_opc" ON public.outsource_price_catalogs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_opc" ON public.outsource_price_catalogs FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_opc" ON public.outsource_price_catalogs FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER trg_opc_updated BEFORE UPDATE ON public.outsource_price_catalogs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. VEHICLE ATTENDANCE (rental / outsourced vehicles)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.outsource_vehicle_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rental_vehicle_id uuid REFERENCES public.rental_vehicles(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  attendance_date date NOT NULL,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','partial','maintenance')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto_gps','override')),
  km_driven numeric(10,2) DEFAULT 0,
  hours_active numeric(5,2) DEFAULT 0,
  fuel_consumed_liters numeric(10,2) DEFAULT 0,
  notes text,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_vehicle_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_ova_org_date ON public.outsource_vehicle_attendance(organization_id, attendance_date DESC);

ALTER TABLE public.outsource_vehicle_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_ova" ON public.outsource_vehicle_attendance FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_ova" ON public.outsource_vehicle_attendance FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_ova" ON public.outsource_vehicle_attendance FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_ova" ON public.outsource_vehicle_attendance FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER trg_ova_updated BEFORE UPDATE ON public.outsource_vehicle_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. PAYMENT REQUESTS (workflow per the supplied flowchart)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.outsource_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  contract_id uuid REFERENCES public.outsource_contracts(id) ON DELETE SET NULL,
  rental_vehicle_id uuid REFERENCES public.rental_vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.supplier_profiles(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_requested numeric(14,2) NOT NULL DEFAULT 0,
  amount_approved numeric(14,2),
  fuel_cost numeric(14,2) DEFAULT 0,
  lubricant_cost numeric(14,2) DEFAULT 0,
  deductions numeric(14,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'ETB',
  -- workflow
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft','submitted','fuel_info_pending','consolidating','info_required',
    'pending_approval','approved','contract_check','validated','rejected','paid','cancelled'
  )),
  submitted_by uuid,
  submitted_at timestamptz DEFAULT now(),
  fuel_info_provided_by uuid,
  fuel_info_provided_at timestamptz,
  consolidated_by uuid,
  consolidated_at timestamptz,
  approver_id uuid,
  approved_at timestamptz,
  approval_chain jsonb DEFAULT '[]'::jsonb,
  contract_check_by uuid,
  contract_check_at timestamptz,
  contract_check_result text CHECK (contract_check_result IN ('valid','invalid','needs_info')),
  rejection_reason text,
  payment_reference text,
  paid_at timestamptz,
  attachments text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, request_number)
);
CREATE INDEX IF NOT EXISTS idx_opr_org_status ON public.outsource_payment_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opr_period ON public.outsource_payment_requests(organization_id, period_start, period_end);

ALTER TABLE public.outsource_payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_opr" ON public.outsource_payment_requests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_opr" ON public.outsource_payment_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_opr" ON public.outsource_payment_requests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_opr" ON public.outsource_payment_requests FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER trg_opr_updated BEFORE UPDATE ON public.outsource_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-number generator
CREATE OR REPLACE FUNCTION public.generate_outsource_payment_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq int;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(request_number, '[^0-9]', '', 'g'), '')::int), 0) + 1
      INTO next_seq
      FROM public.outsource_payment_requests
      WHERE organization_id = NEW.organization_id;
    NEW.request_number := 'OPR-' || lpad(next_seq::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_opr_autonum BEFORE INSERT ON public.outsource_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_outsource_payment_number();

-- =========================================================================
-- 4. PAYMENT REQUEST ITEMS (line breakdown)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.outsource_payment_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_request_id uuid NOT NULL REFERENCES public.outsource_payment_requests(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('attendance','fuel','lubricant','overtime','penalty','bonus','other')),
  description text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  reference_id uuid,
  reference_table text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opri_request ON public.outsource_payment_request_items(payment_request_id);

ALTER TABLE public.outsource_payment_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_opri" ON public.outsource_payment_request_items FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_opri" ON public.outsource_payment_request_items FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_opri" ON public.outsource_payment_request_items FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_opri" ON public.outsource_payment_request_items FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- =========================================================================
-- 5. CAPACITY ALERTS (overage/shortage)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.outsource_capacity_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('vehicle_shortage','vehicle_overage','driver_shortage','driver_overage')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  zone_region text,
  resource_count_current int DEFAULT 0,
  resource_count_optimal int DEFAULT 0,
  utilization_pct numeric(5,2),
  message text NOT NULL,
  recommendation text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oca_org_status ON public.outsource_capacity_alerts(organization_id, status);

ALTER TABLE public.outsource_capacity_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_oca" ON public.outsource_capacity_alerts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_oca" ON public.outsource_capacity_alerts FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_oca" ON public.outsource_capacity_alerts FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_oca" ON public.outsource_capacity_alerts FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER trg_oca_updated BEFORE UPDATE ON public.outsource_capacity_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
