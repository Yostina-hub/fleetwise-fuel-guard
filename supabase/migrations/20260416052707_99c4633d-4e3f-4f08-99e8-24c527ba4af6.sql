
-- 3PL Partners table
CREATE TABLE public.tpl_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  service_types TEXT[] DEFAULT '{}',
  coverage_areas TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  contract_start DATE,
  contract_end DATE,
  contract_value NUMERIC(12,2),
  payment_terms TEXT DEFAULT 'net_30',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpl_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_partners_select" ON public.tpl_partners FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_partners_insert" ON public.tpl_partners FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_partners_update" ON public.tpl_partners FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_partners_delete" ON public.tpl_partners FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_tpl_partners_updated_at BEFORE UPDATE ON public.tpl_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3PL Rate Cards
CREATE TABLE public.tpl_rate_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.tpl_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_zone TEXT,
  destination_zone TEXT,
  service_type TEXT DEFAULT 'standard',
  weight_min_kg NUMERIC(10,2) DEFAULT 0,
  weight_max_kg NUMERIC(10,2),
  rate_per_kg NUMERIC(10,2),
  flat_rate NUMERIC(10,2),
  currency TEXT DEFAULT 'ETB',
  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpl_rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_rate_cards_select" ON public.tpl_rate_cards FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_rate_cards_insert" ON public.tpl_rate_cards FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_rate_cards_update" ON public.tpl_rate_cards FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_rate_cards_delete" ON public.tpl_rate_cards FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_tpl_rate_cards_updated_at BEFORE UPDATE ON public.tpl_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3PL Shipments
CREATE TABLE public.tpl_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.tpl_partners(id) ON DELETE CASCADE,
  dispatch_job_id UUID REFERENCES public.dispatch_jobs(id) ON DELETE SET NULL,
  shipment_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  origin_address TEXT,
  destination_address TEXT,
  weight_kg NUMERIC(10,2),
  cargo_description TEXT,
  pickup_scheduled_at TIMESTAMPTZ,
  pickup_actual_at TIMESTAMPTZ,
  delivery_scheduled_at TIMESTAMPTZ,
  delivery_actual_at TIMESTAMPTZ,
  partner_tracking_number TEXT,
  partner_reference TEXT,
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  rate_card_id UUID REFERENCES public.tpl_rate_cards(id) ON DELETE SET NULL,
  proof_of_delivery_url TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  special_instructions TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpl_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_shipments_select" ON public.tpl_shipments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_shipments_insert" ON public.tpl_shipments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_shipments_update" ON public.tpl_shipments FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_shipments_delete" ON public.tpl_shipments FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_tpl_shipments_updated_at BEFORE UPDATE ON public.tpl_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3PL Invoices
CREATE TABLE public.tpl_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.tpl_partners(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  line_items JSONB DEFAULT '[]'::jsonb,
  payment_date DATE,
  payment_reference TEXT,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpl_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_invoices_select" ON public.tpl_invoices FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_invoices_insert" ON public.tpl_invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_invoices_update" ON public.tpl_invoices FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_invoices_delete" ON public.tpl_invoices FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_tpl_invoices_updated_at BEFORE UPDATE ON public.tpl_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3PL Performance Metrics
CREATE TABLE public.tpl_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.tpl_partners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_shipments INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  late_deliveries INTEGER DEFAULT 0,
  damaged_shipments INTEGER DEFAULT 0,
  lost_shipments INTEGER DEFAULT 0,
  on_time_percentage NUMERIC(5,2) DEFAULT 0,
  damage_rate NUMERIC(5,2) DEFAULT 0,
  avg_transit_hours NUMERIC(8,2),
  total_cost NUMERIC(12,2) DEFAULT 0,
  cost_per_shipment NUMERIC(10,2),
  customer_complaints INTEGER DEFAULT 0,
  overall_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpl_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_performance_metrics_select" ON public.tpl_performance_metrics FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_performance_metrics_insert" ON public.tpl_performance_metrics FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_performance_metrics_update" ON public.tpl_performance_metrics FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "tpl_performance_metrics_delete" ON public.tpl_performance_metrics FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_tpl_performance_metrics_updated_at BEFORE UPDATE ON public.tpl_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_tpl_partners_org ON public.tpl_partners(organization_id);
CREATE INDEX idx_tpl_shipments_org ON public.tpl_shipments(organization_id);
CREATE INDEX idx_tpl_shipments_partner ON public.tpl_shipments(partner_id);
CREATE INDEX idx_tpl_shipments_status ON public.tpl_shipments(status);
CREATE INDEX idx_tpl_invoices_org ON public.tpl_invoices(organization_id);
CREATE INDEX idx_tpl_invoices_partner ON public.tpl_invoices(partner_id);
CREATE INDEX idx_tpl_performance_org ON public.tpl_performance_metrics(organization_id);
