
CREATE TABLE public.driver_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  training_type TEXT NOT NULL DEFAULT 'certification',
  certification_name TEXT NOT NULL,
  provider TEXT,
  completion_date DATE,
  expiry_date DATE,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'scheduled',
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_driver_training" ON public.driver_training FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.parts_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  unit_cost NUMERIC DEFAULT 0,
  supplier TEXT,
  location TEXT,
  vehicle_compatibility TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_restock_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_parts_inventory" ON public.parts_inventory FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.penalties_fines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  fine_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  violation_type TEXT NOT NULL,
  violation_date DATE NOT NULL,
  location TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  payment_status TEXT DEFAULT 'unpaid',
  paid_date DATE,
  paid_amount NUMERIC,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.penalties_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_penalties" ON public.penalties_fines FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'vendor',
  party_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT false,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_contracts" ON public.contracts FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.kpi_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  kpi_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fleet',
  target_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  trend TEXT DEFAULT 'stable',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_kpi" ON public.kpi_scorecards FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.notification_center (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  recipient_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  link_url TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_center ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_notifications" ON public.notification_center FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.compliance_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'upcoming',
  reminder_days_before INTEGER DEFAULT 7,
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_compliance" ON public.compliance_calendar FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_driver_training_updated_at BEFORE UPDATE ON public.driver_training FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parts_inventory_updated_at BEFORE UPDATE ON public.parts_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_penalties_updated_at BEFORE UPDATE ON public.penalties_fines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpi_updated_at BEFORE UPDATE ON public.kpi_scorecards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compliance_updated_at BEFORE UPDATE ON public.compliance_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
