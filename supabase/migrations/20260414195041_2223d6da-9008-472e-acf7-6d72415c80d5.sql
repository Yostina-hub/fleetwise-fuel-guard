
-- Report Templates
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  report_category TEXT NOT NULL,
  report_type TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  columns TEXT[],
  sort_by TEXT,
  sort_order TEXT DEFAULT 'asc',
  group_by TEXT,
  date_range_type TEXT DEFAULT 'last_7_days',
  is_shared BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or shared templates" ON public.report_templates
  FOR SELECT TO authenticated
  USING (
    (organization_id = public.get_user_organization(auth.uid()) AND (created_by = auth.uid() OR is_shared = true))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can manage own templates" ON public.report_templates
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) AND created_by = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update own templates" ON public.report_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can delete own templates" ON public.report_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_super_admin(auth.uid()));

-- Fuel Probe Calibrations (extended from sensor_calibrations)
CREATE TABLE public.fuel_probe_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  probe_model TEXT,
  probe_serial TEXT,
  tank_shape TEXT DEFAULT 'rectangular',
  tank_capacity_liters NUMERIC DEFAULT 0,
  calibration_points JSONB DEFAULT '[]'::jsonb,
  empty_voltage NUMERIC,
  full_voltage NUMERIC,
  calibrated_by TEXT,
  calibration_date TIMESTAMPTZ DEFAULT now(),
  next_calibration_due TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_probe_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage fuel probe calibrations" ON public.fuel_probe_calibrations
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));
