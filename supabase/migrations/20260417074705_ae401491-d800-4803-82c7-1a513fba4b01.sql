
CREATE TABLE IF NOT EXISTS public.work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  operation_sequence INTEGER,
  item_code TEXT,
  item_description TEXT,
  required_quantity NUMERIC DEFAULT 0,
  issued_quantity NUMERIC DEFAULT 0,
  uom TEXT DEFAULT 'EA',
  supply_type TEXT DEFAULT 'Push',
  required_date DATE,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.work_order_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_materials_org_all" ON public.work_order_materials FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wo_materials_wo ON public.work_order_materials(work_order_id);

CREATE TABLE IF NOT EXISTS public.work_order_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  permit_number TEXT,
  permit_type TEXT,
  issued_by TEXT,
  valid_from DATE,
  valid_until DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.work_order_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_permits_org_all" ON public.work_order_permits FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wo_permits_wo ON public.work_order_permits(work_order_id);

CREATE TABLE IF NOT EXISTS public.work_order_quality_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  plan_name TEXT,
  characteristic TEXT,
  specification TEXT,
  result TEXT,
  pass BOOLEAN,
  collected_by TEXT,
  collected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.work_order_quality_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_quality_org_all" ON public.work_order_quality_plans FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wo_quality_wo ON public.work_order_quality_plans(work_order_id);

CREATE TABLE IF NOT EXISTS public.work_order_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  meter_name TEXT NOT NULL,
  reading_value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'KM',
  captured_at TIMESTAMPTZ DEFAULT now(),
  captured_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.work_order_meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_meter_org_all" ON public.work_order_meter_readings FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wo_meter_wo ON public.work_order_meter_readings(work_order_id);

CREATE TABLE IF NOT EXISTS public.work_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);
ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_attach_org_all" ON public.work_order_attachments FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wo_attach_wo ON public.work_order_attachments(work_order_id);

CREATE TRIGGER trg_wo_materials_updated BEFORE UPDATE ON public.work_order_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wo_permits_updated BEFORE UPDATE ON public.work_order_permits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wo_quality_updated BEFORE UPDATE ON public.work_order_quality_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
