
-- 1. EV Vehicle Data
CREATE TABLE IF NOT EXISTS public.ev_vehicle_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  battery_capacity_kwh NUMERIC(10,2),
  battery_type TEXT,
  charging_connector_type TEXT,
  max_charging_rate_kw NUMERIC(10,2),
  current_soc_percent NUMERIC(5,2),
  battery_health_percent NUMERIC(5,2),
  estimated_range_km NUMERIC(10,2),
  odometer_at_last_charge NUMERIC(12,2),
  last_soc_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id)
);

-- 2. EV Charging Sessions
CREATE TABLE IF NOT EXISTS public.ev_charging_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  station_id UUID,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  energy_consumed_kwh NUMERIC(10,2),
  cost_per_kwh NUMERIC(10,4),
  total_cost NUMERIC(12,2),
  soc_start_percent NUMERIC(5,2),
  soc_end_percent NUMERIC(5,2),
  charging_type TEXT DEFAULT 'ac',
  status TEXT DEFAULT 'in_progress',
  station_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. EV Charging Stations
CREATE TABLE IF NOT EXISTS public.ev_charging_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  connector_types TEXT[] DEFAULT '{}',
  max_power_kw NUMERIC(10,2),
  num_ports INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  operator_name TEXT,
  cost_per_kwh NUMERIC(10,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ev_charging_sessions_station_id_fkey') THEN
    ALTER TABLE public.ev_charging_sessions
      ADD CONSTRAINT ev_charging_sessions_station_id_fkey
      FOREIGN KEY (station_id) REFERENCES public.ev_charging_stations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Vehicle Requests
CREATE TABLE IF NOT EXISTS public.vehicle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  requester_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  pool_location TEXT,
  purpose TEXT NOT NULL,
  request_type TEXT DEFAULT 'routine',
  priority TEXT DEFAULT 'normal',
  needed_from TIMESTAMPTZ NOT NULL,
  needed_until TIMESTAMPTZ,
  passengers INTEGER DEFAULT 1,
  destination TEXT,
  distance_estimate_km NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  dispatcher_notes TEXT,
  requester_feedback TEXT,
  requester_rating INTEGER,
  kpi_target_minutes INTEGER,
  actual_assignment_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Vehicle Request Approvals
CREATE TABLE IF NOT EXISTS public.vehicle_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  approver_name TEXT NOT NULL,
  approval_level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  decision_at TIMESTAMPTZ,
  comments TEXT,
  delegated_from UUID,
  delegated_from_name TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Delegation Matrix
CREATE TABLE IF NOT EXISTS public.delegation_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  delegator_id UUID NOT NULL,
  delegator_name TEXT NOT NULL,
  delegate_id UUID NOT NULL,
  delegate_name TEXT NOT NULL,
  scope TEXT DEFAULT 'vehicle_requests',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Vehicle Insurance
CREATE TABLE IF NOT EXISTS public.vehicle_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  provider TEXT NOT NULL,
  insurance_type TEXT DEFAULT 'comprehensive',
  coverage_amount NUMERIC(14,2),
  premium_amount NUMERIC(12,2),
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  auto_renewal BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Accident Claims
CREATE TABLE IF NOT EXISTS public.accident_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  insurance_id UUID REFERENCES public.vehicle_insurance(id) ON DELETE SET NULL,
  incident_id UUID,
  claim_number TEXT NOT NULL,
  accident_date TIMESTAMPTZ NOT NULL,
  accident_location TEXT,
  description TEXT,
  damage_description TEXT,
  estimated_repair_cost NUMERIC(12,2),
  actual_repair_cost NUMERIC(12,2),
  claim_amount NUMERIC(12,2),
  approved_amount NUMERIC(12,2),
  third_party_name TEXT,
  third_party_vehicle TEXT,
  third_party_insurance TEXT,
  third_party_contact TEXT,
  police_report_number TEXT,
  fault_determination TEXT,
  status TEXT DEFAULT 'filed',
  filed_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  repair_start_date DATE,
  repair_end_date DATE,
  repair_vendor TEXT,
  photos TEXT[],
  documents TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Tire Inventory
CREATE TABLE IF NOT EXISTS public.tire_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT,
  size TEXT NOT NULL,
  tire_type TEXT DEFAULT 'all_season',
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(10,2),
  vendor TEXT,
  current_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  position TEXT,
  install_date DATE,
  install_odometer_km NUMERIC(12,2),
  current_tread_depth_mm NUMERIC(5,2),
  max_distance_km NUMERIC(12,2),
  total_distance_km NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'in_stock',
  retired_reason TEXT,
  retired_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Tire Changes
CREATE TABLE IF NOT EXISTS public.tire_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tire_id UUID NOT NULL REFERENCES public.tire_inventory(id) ON DELETE CASCADE,
  change_type TEXT DEFAULT 'install',
  position TEXT NOT NULL,
  odometer_km NUMERIC(12,2),
  tread_depth_mm NUMERIC(5,2),
  reason TEXT,
  performed_by TEXT,
  cost NUMERIC(10,2),
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Route Plans
CREATE TABLE IF NOT EXISTS public.route_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  origin_name TEXT,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_name TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  waypoints JSONB DEFAULT '[]',
  total_distance_km NUMERIC(12,2),
  estimated_duration_minutes INTEGER,
  vehicle_type TEXT DEFAULT 'icev',
  optimization_params JSONB DEFAULT '{}',
  planned_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  route_geojson JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Cold Chain Readings
CREATE TABLE IF NOT EXISTS public.cold_chain_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sensor_id TEXT,
  temperature_celsius NUMERIC(6,2) NOT NULL,
  humidity_percent NUMERIC(5,2),
  door_status TEXT,
  compressor_status TEXT,
  power_status TEXT,
  voltage NUMERIC(6,2),
  min_threshold NUMERIC(6,2),
  max_threshold NUMERIC(6,2),
  is_alarm BOOLEAN DEFAULT false,
  alarm_type TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Add rental fields to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'owned',
  ADD COLUMN IF NOT EXISTS rental_provider TEXT,
  ADD COLUMN IF NOT EXISTS rental_contract_number TEXT,
  ADD COLUMN IF NOT EXISTS rental_daily_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rental_start_date DATE,
  ADD COLUMN IF NOT EXISTS rental_end_date DATE;

-- 14. Outsource Driver Attendance
CREATE TABLE IF NOT EXISTS public.outsource_driver_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  notes TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, attendance_date)
);

-- 15. Add employment type to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS outsource_company TEXT;

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.ev_vehicle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ev_charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ev_charging_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegation_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_chain_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsource_driver_attendance ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'ev_vehicle_data', 'ev_charging_sessions', 'ev_charging_stations',
    'vehicle_requests', 'vehicle_request_approvals', 'delegation_matrix',
    'vehicle_insurance', 'accident_claims',
    'tire_inventory', 'tire_changes', 'route_plans',
    'cold_chain_readings', 'outsource_driver_attendance'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY "Org users can view %1$s" ON public.%1$s
        FOR SELECT TO authenticated
        USING (organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ));
      CREATE POLICY "Org users can insert %1$s" ON public.%1$s
        FOR INSERT TO authenticated
        WITH CHECK (organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ));
      CREATE POLICY "Org users can update %1$s" ON public.%1$s
        FOR UPDATE TO authenticated
        USING (organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ));
      CREATE POLICY "Org users can delete %1$s" ON public.%1$s
        FOR DELETE TO authenticated
        USING (organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ));
    ', tbl);
  END LOOP;
END $$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cold_chain_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ev_charging_sessions;
