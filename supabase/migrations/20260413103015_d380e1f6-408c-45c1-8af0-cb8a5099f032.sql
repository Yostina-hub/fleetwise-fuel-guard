
-- 1. Vehicle Inspections
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  inspector_name TEXT,
  inspector_id UUID,
  inspection_type TEXT NOT NULL DEFAULT 'routine',
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  sticker_number TEXT,
  sticker_expiry DATE,
  checklist_results JSONB,
  overall_result TEXT NOT NULL DEFAULT 'pending',
  defects_found JSONB,
  certified_safe BOOLEAN DEFAULT false,
  notes TEXT,
  photos TEXT[],
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_inspections_select" ON public.vehicle_inspections FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "vehicle_inspections_insert" ON public.vehicle_inspections FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "vehicle_inspections_update" ON public.vehicle_inspections FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "vehicle_inspections_delete" ON public.vehicle_inspections FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "vehicle_inspections_super_admin" ON public.vehicle_inspections FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_vehicle_inspections_updated_at BEFORE UPDATE ON public.vehicle_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Alcohol/Fatigue Tests
CREATE TABLE IF NOT EXISTS public.alcohol_fatigue_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  test_type TEXT NOT NULL DEFAULT 'alcohol',
  test_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  result TEXT NOT NULL DEFAULT 'pending',
  reading_value DOUBLE PRECISION,
  threshold_value DOUBLE PRECISION,
  unit TEXT DEFAULT 'mg/L',
  device_name TEXT,
  device_serial TEXT,
  pass BOOLEAN,
  action_taken TEXT,
  tested_by TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alcohol_fatigue_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alcohol_fatigue_tests_select" ON public.alcohol_fatigue_tests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alcohol_fatigue_tests_insert" ON public.alcohol_fatigue_tests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alcohol_fatigue_tests_update" ON public.alcohol_fatigue_tests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alcohol_fatigue_tests_delete" ON public.alcohol_fatigue_tests FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alcohol_fatigue_tests_super_admin" ON public.alcohol_fatigue_tests FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_alcohol_fatigue_tests_updated_at BEFORE UPDATE ON public.alcohol_fatigue_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Hardware Sensor Data (TPMS, OBD-II, Load/Weight)
CREATE TABLE IF NOT EXISTS public.hardware_sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  sensor_type TEXT NOT NULL,
  sensor_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  readings JSONB NOT NULL DEFAULT '{}',
  is_alert BOOLEAN DEFAULT false,
  alert_type TEXT,
  alert_message TEXT,
  status TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hardware_sensor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hardware_sensor_data_select" ON public.hardware_sensor_data FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "hardware_sensor_data_insert" ON public.hardware_sensor_data FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "hardware_sensor_data_update" ON public.hardware_sensor_data FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "hardware_sensor_data_delete" ON public.hardware_sensor_data FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "hardware_sensor_data_super_admin" ON public.hardware_sensor_data FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));
