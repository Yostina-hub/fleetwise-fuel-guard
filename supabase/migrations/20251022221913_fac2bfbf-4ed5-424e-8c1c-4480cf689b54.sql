-- Telemetry Pipeline Infrastructure

-- Device Protocol Configurations (for AVL codec parsers, vendor-specific decoders)
CREATE TABLE public.device_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  protocol_name TEXT NOT NULL, -- 'teltonika_codec8', 'teltonika_codec8e', 'concox', 'queclink', etc.
  vendor TEXT NOT NULL, -- 'Teltonika', 'Ruptela', 'Queclink', 'Concox'
  version TEXT,
  decoder_config JSONB NOT NULL, -- {parser_type, field_mappings, io_mappings, canbus_mappings}
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, protocol_name, version)
);

-- Link device protocols to device models
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.device_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_devices_protocol ON public.devices(protocol_id);

-- Fuel Detection Configurations (per vehicle/sensor)
CREATE TABLE public.fuel_detection_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
  
  -- Refuel detection thresholds
  refuel_threshold_percent NUMERIC DEFAULT 8.0, -- Δfuel ≥ 8%
  refuel_time_window_seconds INTEGER DEFAULT 300, -- within 5 minutes
  refuel_speed_threshold_kmh NUMERIC DEFAULT 5.0, -- speed < 5 km/h
  
  -- Theft/Leak detection thresholds
  theft_threshold_percent NUMERIC DEFAULT 5.0, -- Δfuel ≤ -5%
  theft_time_window_seconds INTEGER DEFAULT 300, -- within 5 minutes
  theft_speed_threshold_kmh NUMERIC DEFAULT 10.0, -- speed < 10 km/h
  
  -- Smoothing & filtering
  use_kalman_filter BOOLEAN DEFAULT true,
  use_temperature_compensation BOOLEAN DEFAULT true,
  moving_average_window INTEGER DEFAULT 5, -- data points
  min_samples_for_detection INTEGER DEFAULT 3,
  
  -- False-positive guards
  ignore_vibration_spikes BOOLEAN DEFAULT true,
  ignore_hill_gradient BOOLEAN DEFAULT true, -- based on altitude change
  hill_gradient_threshold_percent NUMERIC DEFAULT 5.0,
  ignore_cornering BOOLEAN DEFAULT true, -- based on heading change
  cornering_threshold_degrees NUMERIC DEFAULT 30.0,
  sensor_fault_threshold_hours INTEGER DEFAULT 24,
  
  -- Cross-validation
  require_fuel_card_validation BOOLEAN DEFAULT false,
  validation_time_window_hours INTEGER DEFAULT 2,
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, sensor_id)
);

-- Telemetry Enrichment Settings
CREATE TABLE public.enrichment_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  
  -- Geofence evaluation
  enable_geofence_matching BOOLEAN DEFAULT true,
  geofence_buffer_meters INTEGER DEFAULT 50,
  
  -- Map matching
  enable_map_matching BOOLEAN DEFAULT true,
  map_provider TEXT, -- 'google', 'here', 'osm', 'mapbox'
  snap_to_roads BOOLEAN DEFAULT true,
  road_tolerance_meters INTEGER DEFAULT 100,
  
  -- Speed limit enrichment
  enable_speed_limit_lookup BOOLEAN DEFAULT true,
  speed_limit_provider TEXT,
  
  -- Driver binding
  enable_driver_binding BOOLEAN DEFAULT true,
  driver_id_methods JSONB, -- ['ibutton', 'rfid', 'bluetooth', 'app_login']
  driver_timeout_minutes INTEGER DEFAULT 30, -- assume same driver if < 30min between trips
  
  -- Address geocoding
  enable_reverse_geocoding BOOLEAN DEFAULT true,
  geocoding_provider TEXT,
  cache_geocoding_results BOOLEAN DEFAULT true,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, config_name)
);

-- Raw Telemetry Queue (for debugging, replay, audit trail)
CREATE TABLE public.telemetry_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  protocol TEXT, -- 'tcp', 'udp', 'mqtt', 'http'
  source_ip INET,
  raw_payload BYTEA, -- original binary data
  raw_hex TEXT, -- hex representation
  parsed_payload JSONB, -- decoded JSON
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'skipped'
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_telemetry_ids UUID[], -- array of telemetry record IDs created from this message
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partition by month for performance (optional, can be enabled later)
-- CREATE INDEX idx_telemetry_raw_received ON public.telemetry_raw(received_at DESC);
CREATE INDEX idx_telemetry_raw_device ON public.telemetry_raw(device_id, received_at DESC);
CREATE INDEX idx_telemetry_raw_status ON public.telemetry_raw(processing_status, received_at DESC);

-- Fuel Event Processing Logs (audit trail for detection algorithm)
CREATE TABLE public.fuel_event_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
  fuel_event_id UUID REFERENCES public.fuel_events(id) ON DELETE CASCADE,
  
  processing_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_detected TEXT, -- 'refuel', 'theft', 'leak', 'none'
  detection_confidence NUMERIC, -- 0.0 to 1.0
  
  -- Detection data
  fuel_change_liters NUMERIC,
  fuel_change_percent NUMERIC,
  time_window_seconds INTEGER,
  speed_at_event NUMERIC,
  ignition_status BOOLEAN,
  
  -- Filters applied
  filters_applied JSONB, -- {kalman: true, temperature_compensation: true, ...}
  raw_readings JSONB, -- [{timestamp, fuel_level, temp, lat, lng}, ...]
  smoothed_readings JSONB,
  
  -- Validation results
  false_positive_checks JSONB, -- {vibration: false, hill_gradient: true, cornering: false, ...}
  fuel_card_validation JSONB, -- {found: true, card_id, transaction_id, variance_liters}
  
  -- Algorithm parameters used
  config_snapshot JSONB, -- snapshot of fuel_detection_configs at processing time
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_processing_vehicle ON public.fuel_event_processing_logs(vehicle_id, processing_time DESC);
CREATE INDEX idx_fuel_processing_event ON public.fuel_event_processing_logs(fuel_event_id);

-- Enable RLS
ALTER TABLE public.device_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_detection_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_event_processing_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_protocols
CREATE POLICY "Users can view device protocols in their organization"
  ON public.device_protocols FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage device protocols"
  ON public.device_protocols FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for fuel_detection_configs
CREATE POLICY "Users can view fuel detection configs in their organization"
  ON public.fuel_detection_configs FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage fuel detection configs"
  ON public.fuel_detection_configs FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'fuel_controller'))
  );

-- RLS Policies for enrichment_configs
CREATE POLICY "Users can view enrichment configs in their organization"
  ON public.enrichment_configs FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage enrichment configs"
  ON public.enrichment_configs FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for telemetry_raw
CREATE POLICY "System can insert raw telemetry"
  ON public.telemetry_raw FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can view raw telemetry"
  ON public.telemetry_raw FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for fuel_event_processing_logs
CREATE POLICY "System can insert fuel processing logs"
  ON public.fuel_event_processing_logs FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Fuel controllers can view processing logs"
  ON public.fuel_event_processing_logs FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'fuel_controller') OR has_role(auth.uid(), 'operations_manager'))
  );

-- Create triggers for updated_at
CREATE TRIGGER update_device_protocols_updated_at
  BEFORE UPDATE ON public.device_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_detection_configs_updated_at
  BEFORE UPDATE ON public.fuel_detection_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrichment_configs_updated_at
  BEFORE UPDATE ON public.enrichment_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_device_protocols_org ON public.device_protocols(organization_id);
CREATE INDEX idx_fuel_detection_configs_org ON public.fuel_detection_configs(organization_id);
CREATE INDEX idx_fuel_detection_configs_vehicle ON public.fuel_detection_configs(vehicle_id);
CREATE INDEX idx_enrichment_configs_org ON public.enrichment_configs(organization_id);
CREATE INDEX idx_telemetry_raw_org ON public.telemetry_raw(organization_id);
CREATE INDEX idx_fuel_processing_org ON public.fuel_event_processing_logs(organization_id);