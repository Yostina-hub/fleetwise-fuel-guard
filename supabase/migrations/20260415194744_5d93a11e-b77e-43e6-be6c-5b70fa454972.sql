
-- 1. Maintenance Tickets
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ticket_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'P3',
  category TEXT DEFAULT 'general',
  reported_by TEXT,
  reported_by_user_id UUID,
  assigned_to TEXT,
  assigned_to_user_id UUID,
  escalated_to TEXT,
  escalation_level INT DEFAULT 0,
  escalation_reason TEXT,
  sla_response_hours INT,
  sla_resolution_hours INT,
  sla_response_deadline TIMESTAMPTZ,
  sla_resolution_deadline TIMESTAMPTZ,
  response_time_minutes INT,
  resolution_time_minutes INT,
  sla_response_breached BOOLEAN DEFAULT false,
  sla_resolution_breached BOOLEAN DEFAULT false,
  contract_id UUID,
  vendor_id UUID,
  tags TEXT[],
  attachments TEXT[],
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_maintenance_tickets" ON public.maintenance_tickets
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_maintenance_tickets_org ON public.maintenance_tickets(organization_id);
CREATE INDEX idx_maintenance_tickets_status ON public.maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_priority ON public.maintenance_tickets(priority);
CREATE INDEX idx_maintenance_tickets_vehicle ON public.maintenance_tickets(vehicle_id);

CREATE TRIGGER update_maintenance_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Maintenance Contracts
CREATE TABLE public.maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'annual',
  vendor_name TEXT NOT NULL,
  vendor_id UUID,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  total_value NUMERIC(12,2),
  currency TEXT DEFAULT 'ETB',
  sla_terms JSONB DEFAULT '{}',
  covered_vehicles UUID[],
  covered_service_types TEXT[],
  warranty_terms TEXT,
  payment_terms TEXT,
  status TEXT DEFAULT 'active',
  renewal_notice_days INT DEFAULT 30,
  documents TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_maintenance_contracts" ON public.maintenance_contracts
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_maintenance_contracts_org ON public.maintenance_contracts(organization_id);
CREATE INDEX idx_maintenance_contracts_status ON public.maintenance_contracts(status);

CREATE TRIGGER update_maintenance_contracts_updated_at
  BEFORE UPDATE ON public.maintenance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Maintenance Cost Tracking
CREATE TABLE public.maintenance_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  ticket_id UUID REFERENCES public.maintenance_tickets(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  contract_id UUID REFERENCES public.maintenance_contracts(id),
  vendor_id UUID,
  cost_type TEXT NOT NULL DEFAULT 'labor',
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  budget_amount NUMERIC(12,2),
  variance NUMERIC(12,2),
  invoice_number TEXT,
  invoice_date DATE,
  invoice_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  period_month INT,
  period_year INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_maintenance_cost_tracking" ON public.maintenance_cost_tracking
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_maint_cost_org ON public.maintenance_cost_tracking(organization_id);
CREATE INDEX idx_maint_cost_ticket ON public.maintenance_cost_tracking(ticket_id);
CREATE INDEX idx_maint_cost_vehicle ON public.maintenance_cost_tracking(vehicle_id);

CREATE TRIGGER update_maintenance_cost_tracking_updated_at
  BEFORE UPDATE ON public.maintenance_cost_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Supplier Profiles
CREATE TABLE public.supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  supplier_code TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Ethiopia',
  tax_id TEXT,
  business_license TEXT,
  service_categories TEXT[],
  certifications TEXT[],
  on_time_percentage NUMERIC(5,2) DEFAULT 0,
  quality_rating NUMERIC(3,2) DEFAULT 0,
  cost_variance_percentage NUMERIC(5,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_spend NUMERIC(14,2) DEFAULT 0,
  average_lead_days NUMERIC(5,1) DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  preferred_currency TEXT DEFAULT 'ETB',
  bank_details JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  notes TEXT,
  documents TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_supplier_profiles" ON public.supplier_profiles
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_supplier_profiles_org ON public.supplier_profiles(organization_id);
CREATE INDEX idx_supplier_profiles_active ON public.supplier_profiles(is_active);

CREATE TRIGGER update_supplier_profiles_updated_at
  BEFORE UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  po_number TEXT NOT NULL,
  supplier_id UUID REFERENCES public.supplier_profiles(id),
  contract_id UUID REFERENCES public.maintenance_contracts(id),
  ticket_id UUID REFERENCES public.maintenance_tickets(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'normal',
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  payment_terms TEXT,
  delivery_address TEXT,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_level INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_number TEXT,
  notes TEXT,
  attachments TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_purchase_orders" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_purchase_orders_org ON public.purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Supplier Bids
CREATE TABLE public.supplier_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  rfq_number TEXT NOT NULL,
  rfq_title TEXT NOT NULL,
  rfq_description TEXT,
  rfq_status TEXT DEFAULT 'open',
  rfq_deadline TIMESTAMPTZ,
  supplier_id UUID REFERENCES public.supplier_profiles(id),
  bid_amount NUMERIC(12,2),
  unit_price NUMERIC(12,2),
  quantity INT,
  lead_time_days INT,
  warranty_terms TEXT,
  technical_score NUMERIC(5,2),
  commercial_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  bid_status TEXT DEFAULT 'submitted',
  is_awarded BOOLEAN DEFAULT false,
  awarded_at TIMESTAMPTZ,
  awarded_by TEXT,
  comparison_notes TEXT,
  attachments TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_supplier_bids" ON public.supplier_bids
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_supplier_bids_org ON public.supplier_bids(organization_id);
CREATE INDEX idx_supplier_bids_rfq ON public.supplier_bids(rfq_number);
CREATE INDEX idx_supplier_bids_supplier ON public.supplier_bids(supplier_id);

CREATE TRIGGER update_supplier_bids_updated_at
  BEFORE UPDATE ON public.supplier_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Work Order Portal Access
CREATE TABLE public.work_order_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  portal_type TEXT NOT NULL DEFAULT 'internal',
  user_id UUID,
  supplier_id UUID REFERENCES public.supplier_profiles(id),
  access_name TEXT NOT NULL,
  access_email TEXT,
  access_role TEXT DEFAULT 'viewer',
  access_token_hash TEXT,
  permissions JSONB DEFAULT '{"view": true, "update_status": false, "upload_files": false, "log_time": false}',
  time_logged_minutes INT DEFAULT 0,
  parts_requested JSONB DEFAULT '[]',
  completion_notes TEXT,
  completion_photos TEXT[],
  status_updates JSONB DEFAULT '[]',
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_wo_portal" ON public.work_order_portal_access
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_wo_portal_org ON public.work_order_portal_access(organization_id);
CREATE INDEX idx_wo_portal_wo ON public.work_order_portal_access(work_order_id);
CREATE INDEX idx_wo_portal_supplier ON public.work_order_portal_access(supplier_id);

CREATE TRIGGER update_wo_portal_access_updated_at
  BEFORE UPDATE ON public.work_order_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key from tickets to contracts and suppliers
ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.maintenance_contracts(id),
  ADD CONSTRAINT maintenance_tickets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.supplier_profiles(id);

-- Add foreign key from purchase_orders line to cost tracking
-- Add rate limit triggers
CREATE TRIGGER rate_limit_maintenance_tickets
  BEFORE INSERT ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_purchase_orders
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_supplier_bids
  BEFORE INSERT ON public.supplier_bids
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();
