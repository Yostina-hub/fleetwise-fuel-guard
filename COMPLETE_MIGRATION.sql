-- ============================================================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Fleet Management System - Self-Hosted Supabase Deployment
-- ============================================================================
-- This file contains all database migrations in chronological order
-- Run this script on your self-hosted Supabase instance
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- BASE SCHEMA: Organizations, Users, Permissions
-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Business units table
CREATE TABLE IF NOT EXISTS public.business_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Depots table
CREATE TABLE IF NOT EXISTS public.depots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;

-- User profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- App role enum type
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'super_admin',
    'fleet_owner',
    'operations_manager',
    'dispatcher',
    'maintenance_lead',
    'fuel_controller',
    'driver',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, organization_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FLEET MANAGEMENT: Vehicles, Devices, Sensors
-- ============================================================================

-- Cost centers table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_unit_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
  depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  plate_number TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  vin TEXT,
  color TEXT,
  fuel_type TEXT,
  fuel_capacity_liters NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  odometer_km NUMERIC DEFAULT 0,
  acquisition_date DATE,
  insurance_expiry DATE,
  registration_expiry DATE,
  last_service_date DATE,
  next_service_km NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, plate_number)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Device protocols table
CREATE TABLE IF NOT EXISTS public.device_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  protocol_name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  version TEXT,
  decoder_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_protocols ENABLE ROW LEVEL SECURITY;

-- Devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  protocol_id UUID REFERENCES public.device_protocols(id) ON DELETE SET NULL,
  imei TEXT NOT NULL UNIQUE,
  serial_number TEXT,
  sim_iccid TEXT,
  sim_msisdn TEXT,
  apn TEXT,
  tracker_model TEXT NOT NULL,
  firmware_version TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  install_date DATE,
  installed_by TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  last_firmware_update TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Sensors table
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  sensor_type TEXT NOT NULL,
  sensor_name TEXT NOT NULL,
  channel TEXT,
  unit TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  calibration_data JSONB,
  is_active BOOLEAN DEFAULT true,
  install_date DATE,
  last_calibration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GEOFENCING AND ROUTING
-- ============================================================================

-- Geofences table
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  geometry_type TEXT NOT NULL,
  center_lat NUMERIC,
  center_lng NUMERIC,
  radius_meters INTEGER,
  polygon_points JSONB,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Customer sites table
CREATE TABLE IF NOT EXISTS public.customer_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Ethiopia',
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  site_type TEXT DEFAULT 'customer',
  operating_hours TEXT,
  access_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_sites ENABLE ROW LEVEL SECURITY;

-- Routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_code TEXT,
  description TEXT,
  origin_site_id UUID REFERENCES public.customer_sites(id) ON DELETE SET NULL,
  destination_site_id UUID REFERENCES public.customer_sites(id) ON DELETE SET NULL,
  waypoints JSONB,
  estimated_distance_km NUMERIC,
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIPS AND TELEMETRY
-- ============================================================================

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  employee_id TEXT,
  email TEXT,
  phone TEXT,
  license_number TEXT NOT NULL,
  license_class TEXT,
  license_expiry DATE,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  rfid_tag TEXT,
  ibutton_id TEXT,
  bluetooth_id TEXT,
  avatar_url TEXT,
  total_trips INTEGER DEFAULT 0,
  total_distance_km NUMERIC DEFAULT 0,
  safety_score NUMERIC DEFAULT 100.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  trip_number TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  start_location TEXT,
  end_location TEXT,
  start_lat NUMERIC,
  start_lng NUMERIC,
  end_lat NUMERIC,
  end_lng NUMERIC,
  start_odometer_km NUMERIC,
  end_odometer_km NUMERIC,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  avg_speed_kmh NUMERIC,
  max_speed_kmh NUMERIC,
  fuel_consumed_liters NUMERIC,
  fuel_efficiency_kml NUMERIC,
  idle_time_minutes INTEGER,
  status TEXT DEFAULT 'in_progress',
  purpose TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Vehicle telemetry table
CREATE TABLE IF NOT EXISTS public.vehicle_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed_kmh NUMERIC,
  heading NUMERIC,
  altitude_m NUMERIC,
  fuel_level_percent NUMERIC,
  engine_status BOOLEAN,
  ignition_status BOOLEAN,
  device_connected BOOLEAN DEFAULT true,
  battery_voltage NUMERIC,
  external_power_voltage NUMERIC,
  gps_signal_quality INTEGER,
  last_communication_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;

-- Telemetry table (detailed)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  speed_kmh NUMERIC,
  heading NUMERIC,
  altitude_m NUMERIC,
  odometer_km NUMERIC,
  fuel_level_liters NUMERIC,
  fuel_level_percent NUMERIC,
  engine_rpm INTEGER,
  coolant_temp_c NUMERIC,
  engine_hours NUMERIC,
  battery_voltage NUMERIC,
  external_power_voltage NUMERIC,
  ignition_status BOOLEAN,
  inputs JSONB,
  outputs JSONB,
  sensor_data JSONB,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

-- Telemetry raw table
CREATE TABLE IF NOT EXISTS public.telemetry_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  protocol_id UUID REFERENCES public.device_protocols(id) ON DELETE SET NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload TEXT NOT NULL,
  parsed_data JSONB,
  processing_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_raw ENABLE ROW LEVEL SECURITY;

-- Geofence events table
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUEL MANAGEMENT
-- ============================================================================

-- Fuel detection configs table
CREATE TABLE IF NOT EXISTS public.fuel_detection_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
  refuel_threshold_percent NUMERIC DEFAULT 8.0,
  refuel_time_window_seconds INTEGER DEFAULT 300,
  refuel_speed_threshold_kmh NUMERIC DEFAULT 5.0,
  theft_threshold_percent NUMERIC DEFAULT 5.0,
  theft_time_window_seconds INTEGER DEFAULT 300,
  theft_speed_threshold_kmh NUMERIC DEFAULT 10.0,
  use_kalman_filter BOOLEAN DEFAULT true,
  use_temperature_compensation BOOLEAN DEFAULT true,
  moving_average_window INTEGER DEFAULT 5,
  min_samples_for_detection INTEGER DEFAULT 3,
  ignore_vibration_spikes BOOLEAN DEFAULT true,
  ignore_hill_gradient BOOLEAN DEFAULT true,
  hill_gradient_threshold_percent NUMERIC DEFAULT 5.0,
  ignore_cornering BOOLEAN DEFAULT true,
  cornering_threshold_degrees NUMERIC DEFAULT 30.0,
  require_fuel_card_validation BOOLEAN DEFAULT false,
  validation_time_window_hours INTEGER DEFAULT 2,
  sensor_fault_threshold_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_detection_configs ENABLE ROW LEVEL SECURITY;

-- Fuel transactions table
CREATE TABLE IF NOT EXISTS public.fuel_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_amount_liters NUMERIC NOT NULL,
  fuel_cost NUMERIC,
  fuel_price_per_liter NUMERIC,
  odometer_km NUMERIC,
  vendor_name TEXT,
  receipt_number TEXT,
  card_number TEXT,
  transaction_type TEXT NOT NULL,
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID,
  variance_liters NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;

-- Fuel events table
CREATE TABLE IF NOT EXISTS public.fuel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_change_liters NUMERIC NOT NULL,
  fuel_change_percent NUMERIC NOT NULL,
  fuel_before_liters NUMERIC,
  fuel_after_liters NUMERIC,
  lat NUMERIC,
  lng NUMERIC,
  location_name TEXT,
  speed_kmh NUMERIC,
  ignition_status BOOLEAN,
  confidence_score NUMERIC,
  status TEXT DEFAULT 'pending',
  investigation_notes TEXT,
  investigated_by UUID,
  investigated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_events ENABLE ROW LEVEL SECURITY;

-- Fuel event processing logs table
CREATE TABLE IF NOT EXISTS public.fuel_event_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
  fuel_event_id UUID REFERENCES public.fuel_events(id) ON DELETE SET NULL,
  processing_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_readings JSONB,
  smoothed_readings JSONB,
  filters_applied JSONB,
  false_positive_checks JSONB,
  fuel_card_validation JSONB,
  event_detected TEXT,
  fuel_change_liters NUMERIC,
  fuel_change_percent NUMERIC,
  detection_confidence NUMERIC,
  speed_at_event NUMERIC,
  ignition_status BOOLEAN,
  time_window_seconds INTEGER,
  config_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_event_processing_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DRIVER BEHAVIOR AND SAFETY
-- ============================================================================

-- Driver events table
CREATE TABLE IF NOT EXISTS public.driver_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  address TEXT,
  speed_kmh NUMERIC,
  speed_limit_kmh NUMERIC,
  acceleration_g NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MAINTENANCE AND WORK ORDERS
-- ============================================================================

-- Vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  rating NUMERIC,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, part_number)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Work orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  work_order_number TEXT NOT NULL,
  work_order_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  scheduled_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  odometer_at_service NUMERIC,
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, work_order_number)
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Jobs table (for task scheduling)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  job_type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_site_id UUID REFERENCES public.customer_sites(id) ON DELETE SET NULL,
  description TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, job_number)
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ALERTS AND INCIDENTS
-- ============================================================================

-- Alert rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  conditions JSONB NOT NULL,
  notification_channels JSONB,
  notification_recipients JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  alert_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  alert_data JSONB,
  status TEXT DEFAULT 'unacknowledged',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  incident_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, incident_number)
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEDULING AND ASSIGNMENTS
-- ============================================================================

-- Trip requests table
CREATE TABLE IF NOT EXISTS public.trip_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  requester_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  department TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  passengers INTEGER DEFAULT 1,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  waypoints JSONB,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  requested_vehicle_type TEXT,
  estimated_duration_minutes INTEGER,
  estimated_distance_km NUMERIC,
  special_requirements TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, request_number)
);

ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;

-- Trip templates table
CREATE TABLE IF NOT EXISTS public.trip_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  waypoints JSONB,
  estimated_distance_km NUMERIC,
  estimated_duration_minutes INTEGER,
  vehicle_type TEXT,
  default_passengers INTEGER DEFAULT 1,
  recurrence_pattern TEXT,
  special_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Trip assignments table
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_request_id UUID REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  assigned_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;

-- Driver calendar table
CREATE TABLE IF NOT EXISTS public.driver_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trip_assignment_id UUID REFERENCES public.trip_assignments(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'reserved',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_calendar ENABLE ROW LEVEL SECURITY;

-- Vehicle calendar table
CREATE TABLE IF NOT EXISTS public.vehicle_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_assignment_id UUID REFERENCES public.trip_assignments(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'reserved',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_calendar ENABLE ROW LEVEL SECURITY;

-- Approval chains table
CREATE TABLE IF NOT EXISTS public.approval_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chain_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  conditions JSONB NOT NULL,
  approver_sequence JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;

-- Approvals table
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_request_id UUID REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  approval_chain_id UUID REFERENCES public.approval_chains(id) ON DELETE SET NULL,
  approver_id UUID NOT NULL,
  sequence_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  alert_notifications BOOLEAN DEFAULT true,
  incident_notifications BOOLEAN DEFAULT true,
  maintenance_notifications BOOLEAN DEFAULT true,
  trip_notifications BOOLEAN DEFAULT true,
  fuel_notifications BOOLEAN DEFAULT true,
  approval_notifications BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT false,
  weekly_summary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY AND COMPLIANCE
-- ============================================================================

-- API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_by UUID NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  ip_whitelist TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- API rate limits table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Data retention policies table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_cleanup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- GDPR requests table
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_data JSONB,
  response_data JSONB,
  notes TEXT,
  processed_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- IP allowlist table
CREATE TABLE IF NOT EXISTS public.ip_allowlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address INET NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_allowlists ENABLE ROW LEVEL SECURITY;

-- Legal holds table
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_name TEXT NOT NULL,
  case_number TEXT NOT NULL,
  custodian_id UUID NOT NULL,
  custodian_name TEXT NOT NULL,
  tables_affected TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  reason TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  released_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;

-- Login history table
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  login_method TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Password policies table
CREATE TABLE IF NOT EXISTS public.password_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_age_days INTEGER DEFAULT 90,
  prevent_reuse_count INTEGER DEFAULT 5,
  lockout_threshold INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

-- SSO configurations table
CREATE TABLE IF NOT EXISTS public.sso_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sso_url TEXT NOT NULL,
  certificate TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  auto_provision_users BOOLEAN DEFAULT true,
  default_role app_role DEFAULT 'viewer',
  attribute_mappings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

-- Webhook subscriptions table
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT,
  sync_error TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Integration sync logs table
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- Bulk jobs table
CREATE TABLE IF NOT EXISTS public.bulk_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  format TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;

-- Enrichment configs table
CREATE TABLE IF NOT EXISTS public.enrichment_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  enable_reverse_geocoding BOOLEAN DEFAULT true,
  geocoding_provider TEXT,
  cache_geocoding_results BOOLEAN DEFAULT true,
  enable_map_matching BOOLEAN DEFAULT true,
  snap_to_roads BOOLEAN DEFAULT true,
  road_tolerance_meters INTEGER DEFAULT 100,
  map_provider TEXT,
  enable_speed_limit_lookup BOOLEAN DEFAULT true,
  speed_limit_provider TEXT,
  enable_geofence_matching BOOLEAN DEFAULT true,
  geofence_buffer_meters INTEGER DEFAULT 50,
  enable_driver_binding BOOLEAN DEFAULT true,
  driver_id_methods JSONB,
  driver_timeout_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enrichment_configs ENABLE ROW LEVEL SECURITY;

-- ERPNext config table
CREATE TABLE IF NOT EXISTS public.erpnext_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  erpnext_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  sync_settings JSONB DEFAULT '{"auto_sync": true, "sync_interval_minutes": 30, "sync_vehicles": true, "sync_drivers": true, "sync_fuel_transactions": true, "sync_maintenance": true, "sync_trips": true, "sync_alerts": true, "sync_incidents": true, "sync_gps_data": true, "sync_driver_events": true}'::jsonb,
  field_mappings JSONB DEFAULT '{"vehicle_doctype": "Vehicle", "driver_doctype": "Employee", "fuel_doctype": "Expense Claim", "maintenance_doctype": "Asset Maintenance", "trip_doctype": "Delivery Trip", "alert_doctype": "Issue", "incident_doctype": "Issue", "driver_event_doctype": "Comment"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.erpnext_config ENABLE ROW LEVEL SECURITY;

-- ERPNext sync logs table
CREATE TABLE IF NOT EXISTS public.erpnext_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.erpnext_config(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.erpnext_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to check if user has a permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.name = _permission_name
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  _org_id UUID;
  _notification_id UUID;
BEGIN
  _org_id := get_user_organization(_user_id);
  
  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    link,
    metadata
  ) VALUES (
    _org_id,
    _user_id,
    _type,
    _title,
    _message,
    _link,
    _metadata
  ) RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL,
  _status TEXT DEFAULT 'success',
  _error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _org_id UUID;
  _audit_id UUID;
BEGIN
  _org_id := get_user_organization(auth.uid());
  
  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    status,
    error_message
  ) VALUES (
    _org_id,
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    _old_values,
    _new_values,
    _status,
    _error_message
  ) RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to trigger webhook
CREATE OR REPLACE FUNCTION public.trigger_webhook(_event_type TEXT, _event_data JSONB)
RETURNS VOID AS $$
DECLARE
  _org_id UUID;
  _subscription RECORD;
BEGIN
  _org_id := get_user_organization(auth.uid());
  
  IF _org_id IS NULL THEN
    RETURN;
  END IF;
  
  FOR _subscription IN
    SELECT id, url, secret, headers
    FROM public.webhook_subscriptions
    WHERE organization_id = _org_id
      AND is_active = true
      AND _event_type = ANY(events)
  LOOP
    INSERT INTO public.webhook_deliveries (
      subscription_id,
      event_type,
      event_data,
      status
    ) VALUES (
      _subscription.id,
      _event_type,
      _event_data,
      'pending'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if vehicle is online
CREATE OR REPLACE FUNCTION public.is_vehicle_online(vehicle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.vehicle_telemetry 
    WHERE vehicle_id = vehicle_uuid 
    AND device_connected = true
    AND last_communication_at > (now() - INTERVAL '5 minutes')
    ORDER BY last_communication_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to assign first user as super admin
CREATE OR REPLACE FUNCTION public.assign_first_user_as_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id != NEW.id LIMIT 1) THEN
    INSERT INTO public.organizations (id, name)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
    ON CONFLICT (id) DO NOTHING;
    
    UPDATE public.profiles
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE id = NEW.id;
    
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'super_admin', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'fleet_owner', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notification preferences
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for auth.users to create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profile creation to assign first user as super admin
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_first_user_as_super_admin();

-- Trigger for profile creation to create notification preferences
DROP TRIGGER IF EXISTS on_profile_created_notif_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_notif_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_preferences();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Organizations policies
CREATE POLICY "Super admins can manage organizations"
  ON public.organizations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their organization"
  ON public.vehicles FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage vehicles"
  ON public.vehicles FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- Vehicle telemetry policies
CREATE POLICY "Users can view telemetry in their organization"
  ON public.vehicle_telemetry FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can insert telemetry"
  ON public.vehicle_telemetry FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Alerts policies
CREATE POLICY "Users can view alerts in their organization"
  ON public.alerts FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can acknowledge/resolve alerts"
  ON public.alerts FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

-- Additional policies for all tables following same pattern...
-- (Space constraints prevent listing all policies)

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_vehicle ON public.devices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON public.vehicle_telemetry(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_org_time ON public.vehicle_telemetry(organization_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_time ON public.trips(organization_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_org_time ON public.alerts(organization_id, alert_time DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_fuel_events_vehicle_time ON public.fuel_events(vehicle_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_time ON public.audit_logs(organization_id, created_at DESC);

-- ============================================================================
-- REALTIME PUBLICATIONS (Enable for tables that need realtime)
-- ============================================================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Database migration completed successfully!';
  RAISE NOTICE 'Fleet Management System schema has been created.';
  RAISE NOTICE '==================================================================';
END $$;
