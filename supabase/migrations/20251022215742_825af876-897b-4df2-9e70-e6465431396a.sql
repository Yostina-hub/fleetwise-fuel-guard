-- =============================================
-- 5.1 ASSET & DEVICE MANAGEMENT
-- =============================================

-- Vehicle Master Table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
  
  -- Identification
  vin TEXT UNIQUE,
  plate_number TEXT NOT NULL,
  
  -- Vehicle Details
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  
  -- Fuel & Capacity
  fuel_type TEXT NOT NULL, -- diesel, petrol, electric, hybrid
  tank_capacity_liters DECIMAL(10,2) NOT NULL,
  
  -- Metrics
  odometer_km DECIMAL(10,2) DEFAULT 0,
  engine_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Ownership
  ownership_type TEXT, -- owned, leased, rented
  acquisition_date DATE,
  acquisition_cost DECIMAL(12,2),
  depreciation_rate DECIMAL(5,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, maintenance, inactive, sold
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_organization ON public.vehicles(organization_id);
CREATE INDEX idx_vehicles_depot ON public.vehicles(depot_id);
CREATE INDEX idx_vehicles_plate ON public.vehicles(plate_number);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Device Registry
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  
  -- Device Details
  tracker_model TEXT NOT NULL,
  imei TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  
  -- SIM Details
  sim_iccid TEXT,
  sim_msisdn TEXT,
  apn TEXT,
  
  -- Firmware
  firmware_version TEXT,
  last_firmware_update TIMESTAMPTZ,
  
  -- Installation
  install_date DATE,
  installed_by TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, maintenance, decommissioned
  last_heartbeat TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_organization ON public.devices(organization_id);
CREATE INDEX idx_devices_vehicle ON public.devices(vehicle_id);
CREATE INDEX idx_devices_imei ON public.devices(imei);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Sensor Registry
CREATE TABLE public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  
  -- Sensor Type
  sensor_type TEXT NOT NULL, -- fuel_probe, flow_meter, temperature, door, pto, tpms, canbus
  sensor_subtype TEXT, -- capacitive, ultrasonic, etc.
  
  -- Installation
  install_location TEXT, -- tank_a, tank_b, front_left_tire, etc.
  install_date DATE,
  
  -- Calibration (for fuel sensors)
  calibration_curve JSONB, -- stores calibration points
  temperature_compensation BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  last_reading TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensors_vehicle ON public.sensors(vehicle_id);
CREATE INDEX idx_sensors_type ON public.sensors(sensor_type);

ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.2 LIVE TRACKING & MAPPING
-- =============================================

-- Geofences
CREATE TABLE public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Geofence Details
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- depot, customer, fuel_station, no_go, toll, border
  
  -- Geometry (simplified - using center + radius for circular, or polygon points)
  geometry_type TEXT NOT NULL, -- circle, polygon
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  radius_meters INTEGER,
  polygon_points JSONB, -- array of {lat, lng} points
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofences_organization ON public.geofences(organization_id);
CREATE INDEX idx_geofences_category ON public.geofences(category);

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Trip Details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  
  -- Location
  start_location JSONB, -- {lat, lng, address}
  end_location JSONB,
  
  -- Metrics
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  avg_speed_kmh DECIMAL(5,2),
  max_speed_kmh DECIMAL(5,2),
  
  -- Fuel
  start_fuel_level DECIMAL(5,2),
  end_fuel_level DECIMAL(5,2),
  fuel_consumed_liters DECIMAL(10,2),
  fuel_efficiency_kmpl DECIMAL(5,2),
  
  -- Odometer
  start_odometer DECIMAL(10,2),
  end_odometer DECIMAL(10,2),
  
  -- Events
  idle_time_minutes INTEGER DEFAULT 0,
  stops_count INTEGER DEFAULT 0,
  harsh_events_count INTEGER DEFAULT 0,
  speeding_events_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, cancelled
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX idx_trips_driver ON public.trips(driver_id);
CREATE INDEX idx_trips_start_time ON public.trips(start_time);
CREATE INDEX idx_trips_organization ON public.trips(organization_id);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Geofence Events
CREATE TABLE public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type TEXT NOT NULL, -- entry, exit
  event_time TIMESTAMPTZ NOT NULL,
  
  -- Location
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofence_events_vehicle ON public.geofence_events(vehicle_id);
CREATE INDEX idx_geofence_events_time ON public.geofence_events(event_time);

ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- Telemetry Points (high-frequency data)
CREATE TABLE public.telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL,
  
  -- Location
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  altitude DECIMAL(8,2),
  heading DECIMAL(5,2),
  
  -- Movement
  speed_kmh DECIMAL(5,2),
  ignition BOOLEAN,
  
  -- Fuel
  fuel_level_percent DECIMAL(5,2),
  fuel_level_liters DECIMAL(10,2),
  
  -- Engine
  engine_rpm INTEGER,
  engine_temp_celsius DECIMAL(5,2),
  
  -- Additional Sensors
  battery_voltage DECIMAL(5,2),
  external_voltage DECIMAL(5,2),
  
  -- Raw Data (for advanced features)
  raw_data JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telemetry_vehicle ON public.telemetry(vehicle_id);
CREATE INDEX idx_telemetry_time ON public.telemetry(recorded_at);
CREATE INDEX idx_telemetry_trip ON public.telemetry(trip_id);

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.3 FUEL MANAGEMENT
-- =============================================

-- Fuel Transactions (from fuel cards/purchases)
CREATE TABLE public.fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_date TIMESTAMPTZ NOT NULL,
  transaction_type TEXT NOT NULL, -- purchase, sensor_refuel, sensor_theft, sensor_leak
  
  -- Fuel Details
  fuel_amount_liters DECIMAL(10,2) NOT NULL,
  fuel_cost DECIMAL(10,2),
  fuel_price_per_liter DECIMAL(10,4),
  
  -- Location
  location_name TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  
  -- Card Details (if from fuel card)
  card_number TEXT,
  receipt_number TEXT,
  vendor_name TEXT,
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id),
  variance_liters DECIMAL(10,2),
  
  -- Odometer at transaction
  odometer_km DECIMAL(10,2),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_transactions_vehicle ON public.fuel_transactions(vehicle_id);
CREATE INDEX idx_fuel_transactions_date ON public.fuel_transactions(transaction_date);
CREATE INDEX idx_fuel_transactions_type ON public.fuel_transactions(transaction_type);

ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;

-- Fuel Events (automated detection)
CREATE TABLE public.fuel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type TEXT NOT NULL, -- refuel, theft, leak
  event_time TIMESTAMPTZ NOT NULL,
  
  -- Fuel Change
  fuel_change_liters DECIMAL(10,2) NOT NULL,
  fuel_change_percent DECIMAL(5,2) NOT NULL,
  fuel_before_liters DECIMAL(10,2),
  fuel_after_liters DECIMAL(10,2),
  
  -- Context
  location_name TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  speed_kmh DECIMAL(5,2),
  ignition_status BOOLEAN,
  
  -- Detection Confidence
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  
  -- Investigation Status
  status TEXT DEFAULT 'pending', -- pending, confirmed, false_positive, resolved
  investigated_by UUID REFERENCES auth.users(id),
  investigated_at TIMESTAMPTZ,
  investigation_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_events_vehicle ON public.fuel_events(vehicle_id);
CREATE INDEX idx_fuel_events_time ON public.fuel_events(event_time);
CREATE INDEX idx_fuel_events_type ON public.fuel_events(event_type);
CREATE INDEX idx_fuel_events_status ON public.fuel_events(status);

ALTER TABLE public.fuel_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.4 DRIVER BEHAVIOUR & SAFETY
-- =============================================

-- Drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Personal Details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Driver Details
  license_number TEXT UNIQUE NOT NULL,
  license_expiry DATE,
  license_class TEXT,
  
  -- Employment
  employee_id TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  
  -- Identification Method
  rfid_tag TEXT,
  ibutton_id TEXT,
  bluetooth_id TEXT,
  
  -- Safety Metrics
  total_trips INTEGER DEFAULT 0,
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  safety_score DECIMAL(5,2) DEFAULT 100.0,
  
  -- Metadata
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_organization ON public.drivers(organization_id);
CREATE INDEX idx_drivers_license ON public.drivers(license_number);
CREATE INDEX idx_drivers_status ON public.drivers(status);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Driver Events (harsh driving, speeding, etc.)
CREATE TABLE public.driver_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type TEXT NOT NULL, -- harsh_acceleration, harsh_braking, harsh_cornering, speeding, crash_detection
  event_time TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL, -- low, medium, high, critical
  
  -- Location
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  address TEXT,
  
  -- Metrics
  speed_kmh DECIMAL(5,2),
  speed_limit_kmh DECIMAL(5,2),
  acceleration_g DECIMAL(5,3),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_events_driver ON public.driver_events(driver_id);
CREATE INDEX idx_driver_events_time ON public.driver_events(event_time);
CREATE INDEX idx_driver_events_type ON public.driver_events(event_type);

ALTER TABLE public.driver_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.5 DISPATCH, JOBS & ROUTING
-- =============================================

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Assignment
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Job Details
  job_number TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL, -- delivery, pickup, service, transport
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Locations
  pickup_location JSONB, -- {lat, lng, address, contact}
  delivery_location JSONB,
  
  -- Schedule
  scheduled_pickup_time TIMESTAMPTZ,
  scheduled_delivery_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  
  -- Cargo
  cargo_description TEXT,
  cargo_weight_kg DECIMAL(10,2),
  cargo_volume_m3 DECIMAL(10,3),
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
  
  -- Proof of Delivery
  pod_signature_url TEXT,
  pod_photos JSONB, -- array of photo URLs
  pod_notes TEXT,
  pod_completed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_vehicle ON public.jobs(vehicle_id);
CREATE INDEX idx_jobs_driver ON public.jobs(driver_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_scheduled ON public.jobs(scheduled_delivery_time);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.6 MAINTENANCE & COMPLIANCE
-- =============================================

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Vendor Details
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- service_provider, parts_supplier, fuel_provider
  
  -- Contact
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Rating
  rating DECIMAL(3,2), -- 0.00 to 5.00
  total_jobs INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_organization ON public.vendors(organization_id);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Work Orders
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  
  -- Work Order Details
  work_order_number TEXT UNIQUE NOT NULL,
  work_type TEXT NOT NULL, -- preventive, corrective, inspection
  priority TEXT DEFAULT 'normal',
  
  -- Service Details
  service_description TEXT NOT NULL,
  service_category TEXT, -- oil_change, tire_service, brake_repair, engine_repair, etc.
  
  -- Schedule
  scheduled_date DATE,
  completed_date DATE,
  
  -- Costs
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Odometer
  odometer_at_service DECIMAL(10,2),
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  
  -- Technician
  technician_name TEXT,
  
  -- Metadata
  notes TEXT,
  attachments JSONB, -- array of file URLs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_orders_vehicle ON public.work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_scheduled ON public.work_orders(scheduled_date);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5.7 ALERTS & AUTOMATION
-- =============================================

-- Alert Rules
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Rule Details
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- speeding, idle, fuel_drop, geofence, device_offline, etc.
  severity TEXT NOT NULL, -- info, warning, critical
  
  -- Conditions
  conditions JSONB NOT NULL, -- flexible JSON for different rule types
  
  -- Notifications
  notification_channels JSONB, -- {email: true, sms: false, whatsapp: false, in_app: true}
  notification_recipients JSONB, -- array of user IDs or email addresses
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_rules_organization ON public.alert_rules(organization_id);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Alerts (generated from rules)
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  
  -- Alert Details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Context
  alert_time TIMESTAMPTZ NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  location_name TEXT,
  
  -- Additional Data
  alert_data JSONB,
  
  -- Status
  status TEXT DEFAULT 'unacknowledged', -- unacknowledged, acknowledged, resolved
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_vehicle ON public.alerts(vehicle_id);
CREATE INDEX idx_alerts_time ON public.alerts(alert_time);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;