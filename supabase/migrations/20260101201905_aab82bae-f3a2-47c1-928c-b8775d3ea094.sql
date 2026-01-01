-- =====================================================
-- COMPREHENSIVE FUEL MANAGEMENT & OPERATIONS SCHEMA
-- =====================================================

-- 1. FUEL DEPOTS (Internal fuel stations)
CREATE TABLE IF NOT EXISTS public.fuel_depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  capacity_liters NUMERIC NOT NULL DEFAULT 10000,
  current_stock_liters NUMERIC NOT NULL DEFAULT 0,
  fuel_type TEXT NOT NULL DEFAULT 'diesel',
  min_stock_threshold NUMERIC DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  geofence_id UUID REFERENCES public.geofences(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FUEL DEPOT RECEIVING (Fuel deliveries to depot)
CREATE TABLE IF NOT EXISTS public.fuel_depot_receiving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  depot_id UUID NOT NULL REFERENCES public.fuel_depots(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier_name TEXT NOT NULL,
  delivery_note_number TEXT,
  liters_received NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_cost NUMERIC,
  density NUMERIC,
  temperature_celsius NUMERIC,
  stock_before_liters NUMERIC,
  stock_after_liters NUMERIC,
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FUEL DEPOT DISPENSING (Fuel issued from depot)
CREATE TABLE IF NOT EXISTS public.fuel_depot_dispensing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  depot_id UUID NOT NULL REFERENCES public.fuel_depots(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  liters_dispensed NUMERIC NOT NULL,
  odometer_km NUMERIC,
  pump_number TEXT,
  attendant_id UUID,
  authorization_code TEXT,
  stock_before_liters NUMERIC,
  stock_after_liters NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FUEL RECONCILIATION RECORDS
CREATE TABLE IF NOT EXISTS public.fuel_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  transaction_id UUID REFERENCES public.fuel_transactions(id),
  fuel_event_id UUID REFERENCES public.fuel_events(id),
  reconciliation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_liters NUMERIC,
  sensor_change_liters NUMERIC,
  distance_km NUMERIC,
  expected_consumption_liters NUMERIC,
  actual_consumption_liters NUMERIC,
  variance_liters NUMERIC,
  variance_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  mismatch_type TEXT,
  mismatch_severity TEXT,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FUEL THEFT CASES
CREATE TABLE IF NOT EXISTS public.fuel_theft_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  fuel_event_id UUID REFERENCES public.fuel_events(id),
  case_number TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  fuel_lost_liters NUMERIC NOT NULL,
  estimated_value NUMERIC,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_name TEXT,
  evidence_data JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  investigation_notes TEXT,
  outcome TEXT,
  recovery_amount NUMERIC,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DISPATCH JOBS
CREATE TABLE IF NOT EXISTS public.dispatch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'delivery',
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT DEFAULT 'normal',
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  customer_name TEXT,
  customer_phone TEXT,
  pickup_location_name TEXT,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  pickup_geofence_id UUID REFERENCES public.geofences(id),
  dropoff_location_name TEXT,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  dropoff_geofence_id UUID REFERENCES public.geofences(id),
  scheduled_pickup_at TIMESTAMPTZ,
  scheduled_dropoff_at TIMESTAMPTZ,
  actual_pickup_at TIMESTAMPTZ,
  actual_dropoff_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_deadline_at TIMESTAMPTZ,
  sla_met BOOLEAN,
  cargo_description TEXT,
  cargo_weight_kg NUMERIC,
  special_instructions TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PROOF OF DELIVERY
CREATE TABLE IF NOT EXISTS public.dispatch_pod (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID,
  lat NUMERIC,
  lng NUMERIC,
  recipient_name TEXT,
  signature_url TEXT,
  photo_urls TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. MAINTENANCE SCHEDULES (Preventive)
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  interval_type TEXT NOT NULL,
  interval_value INTEGER NOT NULL,
  last_service_date TIMESTAMPTZ,
  last_service_odometer NUMERIC,
  last_service_hours NUMERIC,
  next_due_date TIMESTAMPTZ,
  next_due_odometer NUMERIC,
  next_due_hours NUMERIC,
  reminder_days_before INTEGER DEFAULT 7,
  reminder_km_before INTEGER DEFAULT 500,
  priority TEXT DEFAULT 'medium',
  checklist_template_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. VEHICLE INSPECTIONS (DVIR)
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  inspection_type TEXT NOT NULL DEFAULT 'pre_trip',
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  odometer_km NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  checklist_data JSONB,
  defects_found JSONB,
  overall_condition TEXT,
  inspector_signature_url TEXT,
  mechanic_signature_url TEXT,
  mechanic_notes TEXT,
  repaired_at TIMESTAMPTZ,
  certified_safe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. INCIDENTS (Enhanced)
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  trip_id UUID REFERENCES public.trips(id),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'reported',
  incident_date TIMESTAMPTZ NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_name TEXT,
  description TEXT NOT NULL,
  injuries_count INTEGER DEFAULT 0,
  fatalities_count INTEGER DEFAULT 0,
  third_party_involved BOOLEAN DEFAULT false,
  third_party_details TEXT,
  police_report_number TEXT,
  police_report_filed BOOLEAN DEFAULT false,
  estimated_damage_cost NUMERIC,
  actual_repair_cost NUMERIC,
  vehicle_driveable BOOLEAN DEFAULT true,
  tow_required BOOLEAN DEFAULT false,
  photo_urls TEXT[],
  document_urls TEXT[],
  witness_info JSONB,
  reported_by UUID,
  investigated_by UUID,
  investigation_notes TEXT,
  root_cause TEXT,
  preventive_actions TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. INSURANCE CLAIMS
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  claim_number TEXT NOT NULL,
  insurance_provider TEXT,
  policy_number TEXT,
  claim_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'filed',
  filed_date TIMESTAMPTZ,
  claim_amount NUMERIC,
  approved_amount NUMERIC,
  deductible NUMERIC,
  settlement_amount NUMERIC,
  settlement_date TIMESTAMPTZ,
  adjuster_name TEXT,
  adjuster_phone TEXT,
  adjuster_email TEXT,
  notes TEXT,
  document_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TRAFFIC VIOLATIONS
CREATE TABLE IF NOT EXISTS public.traffic_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  violation_date TIMESTAMPTZ NOT NULL,
  violation_type TEXT NOT NULL,
  location_name TEXT,
  fine_amount NUMERIC,
  payment_status TEXT DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  paid_by TEXT,
  ticket_number TEXT,
  issuing_authority TEXT,
  points_assigned INTEGER,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. VEHICLE COST TRACKING (TCO)
CREATE TABLE IF NOT EXISTS public.vehicle_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  cost_date DATE NOT NULL,
  cost_type TEXT NOT NULL,
  category TEXT,
  description TEXT,
  amount NUMERIC NOT NULL,
  odometer_km NUMERIC,
  reference_id UUID,
  reference_type TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. APPROVED FUEL STATIONS (for theft detection)
CREATE TABLE IF NOT EXISTS public.approved_fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  radius_meters INTEGER DEFAULT 200,
  geofence_id UUID REFERENCES public.geofences(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.fuel_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_depot_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_depot_dispensing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_theft_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_pod ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_fuel_stations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "view_fuel_depots" ON public.fuel_depots FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_fuel_depots" ON public.fuel_depots FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_depot_receiving" ON public.fuel_depot_receiving FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_depot_receiving" ON public.fuel_depot_receiving FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_depot_dispensing" ON public.fuel_depot_dispensing FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_depot_dispensing" ON public.fuel_depot_dispensing FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_reconciliations" ON public.fuel_reconciliations FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_reconciliations" ON public.fuel_reconciliations FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_theft_cases" ON public.fuel_theft_cases FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_theft_cases" ON public.fuel_theft_cases FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_dispatch_jobs" ON public.dispatch_jobs FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_dispatch_jobs" ON public.dispatch_jobs FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'dispatcher') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_dispatch_pod" ON public.dispatch_pod FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_dispatch_pod" ON public.dispatch_pod FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'dispatcher') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'driver')));

CREATE POLICY "view_maintenance_schedules" ON public.maintenance_schedules FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_maintenance_schedules" ON public.maintenance_schedules FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'maintenance_lead') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_vehicle_inspections" ON public.vehicle_inspections FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_vehicle_inspections" ON public.vehicle_inspections FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'driver') OR has_role(auth.uid(), 'maintenance_lead') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_incidents" ON public.incidents FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "create_incidents" ON public.incidents FOR INSERT WITH CHECK (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_incidents" ON public.incidents FOR UPDATE USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_insurance_claims" ON public.insurance_claims FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_insurance_claims" ON public.insurance_claims FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_traffic_violations" ON public.traffic_violations FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_traffic_violations" ON public.traffic_violations FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager')));

CREATE POLICY "view_vehicle_costs" ON public.vehicle_costs FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_vehicle_costs" ON public.vehicle_costs FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'maintenance_lead')));

CREATE POLICY "view_approved_stations" ON public.approved_fuel_stations FOR SELECT USING (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "manage_approved_stations" ON public.approved_fuel_stations FOR ALL USING (organization_id = get_user_organization(auth.uid()) AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager')));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fuel_depots_org ON public.fuel_depots(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_vehicle ON public.fuel_reconciliations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_status ON public.fuel_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_fuel_theft_cases_vehicle ON public.fuel_theft_cases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_theft_cases_status ON public.fuel_theft_cases(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_status ON public.dispatch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_vehicle ON public.dispatch_jobs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_driver ON public.dispatch_jobs(driver_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle ON public.maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON public.vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_vehicle ON public.incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_vehicle ON public.vehicle_costs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_type ON public.vehicle_costs(cost_type);