
-- 1. Dash Cam Events
CREATE TABLE IF NOT EXISTS public.dash_cam_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  event_type TEXT NOT NULL DEFAULT 'manual',
  severity TEXT NOT NULL DEFAULT 'low',
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  ai_detected BOOLEAN DEFAULT false,
  ai_confidence DOUBLE PRECISION,
  ai_labels JSONB,
  notes TEXT,
  status TEXT DEFAULT 'new',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dash_cam_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dash_cam_events_select" ON public.dash_cam_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "dash_cam_events_insert" ON public.dash_cam_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "dash_cam_events_update" ON public.dash_cam_events FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "dash_cam_events_delete" ON public.dash_cam_events FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_dash_cam_events_updated_at BEFORE UPDATE ON public.dash_cam_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Fuel Requests
CREATE TABLE IF NOT EXISTS public.fuel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  requested_by UUID NOT NULL,
  approved_by UUID,
  request_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fuel_type TEXT DEFAULT 'diesel',
  liters_requested DOUBLE PRECISION NOT NULL,
  liters_approved DOUBLE PRECISION,
  estimated_cost DOUBLE PRECISION,
  actual_cost DOUBLE PRECISION,
  cost_center TEXT,
  purpose TEXT,
  current_odometer DOUBLE PRECISION,
  station_id UUID REFERENCES public.approved_fuel_stations(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  rejected_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fuel_requests_select" ON public.fuel_requests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "fuel_requests_insert" ON public.fuel_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "fuel_requests_update" ON public.fuel_requests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "fuel_requests_delete" ON public.fuel_requests FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_fuel_requests_updated_at BEFORE UPDATE ON public.fuel_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Driver Logbooks
CREATE TABLE IF NOT EXISTS public.driver_logbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  driving_hours DOUBLE PRECISION DEFAULT 0,
  rest_hours DOUBLE PRECISION DEFAULT 0,
  break_count INTEGER DEFAULT 0,
  total_break_minutes DOUBLE PRECISION DEFAULT 0,
  distance_km DOUBLE PRECISION DEFAULT 0,
  compliance_status TEXT DEFAULT 'compliant',
  violations JSONB,
  route_summary TEXT,
  start_odometer DOUBLE PRECISION,
  end_odometer DOUBLE PRECISION,
  supervisor_approved BOOLEAN DEFAULT false,
  supervisor_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_logbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_logbooks_select" ON public.driver_logbooks FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "driver_logbooks_insert" ON public.driver_logbooks FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "driver_logbooks_update" ON public.driver_logbooks FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "driver_logbooks_delete" ON public.driver_logbooks FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_driver_logbooks_updated_at BEFORE UPDATE ON public.driver_logbooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Roadside Assistance Requests
CREATE TABLE IF NOT EXISTS public.roadside_assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  request_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  breakdown_type TEXT NOT NULL DEFAULT 'mechanical',
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_name TEXT,
  service_provider TEXT,
  provider_phone TEXT,
  provider_eta_minutes INTEGER,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  tow_required BOOLEAN DEFAULT false,
  estimated_cost DOUBLE PRECISION,
  actual_cost DOUBLE PRECISION,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roadside_assistance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadside_assistance_select" ON public.roadside_assistance_requests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "roadside_assistance_insert" ON public.roadside_assistance_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "roadside_assistance_update" ON public.roadside_assistance_requests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "roadside_assistance_delete" ON public.roadside_assistance_requests FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_roadside_assistance_updated_at BEFORE UPDATE ON public.roadside_assistance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Carbon Emissions
CREATE TABLE IF NOT EXISTS public.carbon_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  co2_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  fuel_consumed_liters DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  emission_source TEXT DEFAULT 'fuel_combustion',
  calculation_method TEXT DEFAULT 'tier1',
  emission_factor DOUBLE PRECISION,
  offset_credits DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.carbon_emissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbon_emissions_select" ON public.carbon_emissions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "carbon_emissions_insert" ON public.carbon_emissions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "carbon_emissions_update" ON public.carbon_emissions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "carbon_emissions_delete" ON public.carbon_emissions FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_carbon_emissions_updated_at BEFORE UPDATE ON public.carbon_emissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add super_admin bypass policies for all new tables
CREATE POLICY "dash_cam_events_super_admin" ON public.dash_cam_events FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "fuel_requests_super_admin" ON public.fuel_requests FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "driver_logbooks_super_admin" ON public.driver_logbooks FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "roadside_assistance_super_admin" ON public.roadside_assistance_requests FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "carbon_emissions_super_admin" ON public.carbon_emissions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
