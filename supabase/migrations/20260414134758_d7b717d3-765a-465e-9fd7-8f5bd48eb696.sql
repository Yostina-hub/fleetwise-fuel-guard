
-- Dashboard layouts saved per user
CREATE TABLE public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Dashboard',
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard layouts"
  ON public.dashboard_layouts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System configuration key-value store per organization
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category, key)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'org_admin')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'org_admin')
  );

-- Hardware sensor calibrations
CREATE TABLE public.sensor_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  sensor_id TEXT,
  calibration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_calibration_date TIMESTAMPTZ,
  calibrated_by TEXT,
  calibration_data JSONB DEFAULT '{}'::jsonb,
  alert_thresholds JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sensor_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sensor calibrations"
  ON public.sensor_calibrations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can manage sensor calibrations"
  ON public.sensor_calibrations FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Performance simulation scenarios saved per user
CREATE TABLE public.simulation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own simulation scenarios"
  ON public.simulation_scenarios FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_layouts_updated_at BEFORE UPDATE ON public.dashboard_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sensor_calibrations_updated_at BEFORE UPDATE ON public.sensor_calibrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_simulation_scenarios_updated_at BEFORE UPDATE ON public.simulation_scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
