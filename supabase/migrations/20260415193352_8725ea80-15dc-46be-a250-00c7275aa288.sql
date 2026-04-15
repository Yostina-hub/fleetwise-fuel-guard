
-- ═══════════════════════════════════════════════════
-- IoT Sensor Management System
-- Covers: Sensor Inventory, Door Monitoring, Panic Button,
--         TPMS Readings, Driver Identification Events
-- ═══════════════════════════════════════════════════

-- 1. IoT Sensor Inventory (master registry of all physical sensors)
CREATE TABLE public.iot_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  device_id UUID REFERENCES public.devices(id),
  sensor_type TEXT NOT NULL CHECK (sensor_type IN ('temperature', 'door', 'panic_button', 'tpms', 'driver_id', 'fuel', 'humidity', 'load', 'obd2')),
  sensor_model TEXT NOT NULL,
  sensor_serial TEXT,
  manufacturer TEXT,
  protocol TEXT CHECK (protocol IN ('1-wire', 'ble', 'wired', 'rs485', 'canbus', 'analog')),
  firmware_version TEXT,
  installation_date DATE,
  last_calibration_date DATE,
  next_calibration_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'faulty', 'maintenance', 'decommissioned')),
  position_label TEXT, -- e.g. 'Compartment A', 'Front-Left', 'Rear Door'
  config JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.iot_sensors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sensors"
  ON public.iot_sensors FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org sensors"
  ON public.iot_sensors FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org sensors"
  ON public.iot_sensors FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org sensors"
  ON public.iot_sensors FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_iot_sensors_updated_at
  BEFORE UPDATE ON public.iot_sensors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_iot_sensors_org ON public.iot_sensors(organization_id);
CREATE INDEX idx_iot_sensors_vehicle ON public.iot_sensors(vehicle_id);
CREATE INDEX idx_iot_sensors_type ON public.iot_sensors(sensor_type);

-- 2. Door Sensor Events (Cargo Security)
CREATE TABLE public.door_sensor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  sensor_id UUID REFERENCES public.iot_sensors(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'close', 'tamper', 'forced_open')),
  door_label TEXT, -- e.g. 'Rear', 'Side-Left', 'Cargo Bay 1'
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  in_approved_zone BOOLEAN,
  geofence_id UUID REFERENCES public.geofences(id),
  duration_seconds INTEGER, -- how long door stayed open
  alert_triggered BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.door_sensor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org door events"
  ON public.door_sensor_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org door events"
  ON public.door_sensor_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_door_events_org ON public.door_sensor_events(organization_id);
CREATE INDEX idx_door_events_vehicle ON public.door_sensor_events(vehicle_id, event_time DESC);

-- 3. Panic Button Events (Emergency Response)
CREATE TABLE public.panic_button_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  sensor_id UUID REFERENCES public.iot_sensors(id),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  speed_kmh NUMERIC,
  activation_type TEXT DEFAULT 'manual' CHECK (activation_type IN ('manual', 'silent', 'auto')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dispatched', 'resolved', 'false_alarm')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  response_time_seconds INTEGER,
  resolution_notes TEXT,
  notifications_sent JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.panic_button_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org panic events"
  ON public.panic_button_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org panic events"
  ON public.panic_button_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org panic events"
  ON public.panic_button_events FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_panic_events_updated_at
  BEFORE UPDATE ON public.panic_button_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_panic_events_org ON public.panic_button_events(organization_id);
CREATE INDEX idx_panic_events_active ON public.panic_button_events(organization_id, status) WHERE status = 'active';

-- 4. TPMS Readings (Tire Pressure Monitoring)
CREATE TABLE public.tpms_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  sensor_id UUID REFERENCES public.iot_sensors(id),
  tire_position TEXT NOT NULL CHECK (tire_position IN ('front_left', 'front_right', 'rear_left', 'rear_right', 'spare', 'axle2_left', 'axle2_right', 'axle3_left', 'axle3_right')),
  pressure_psi NUMERIC,
  pressure_bar NUMERIC,
  temperature_celsius NUMERIC,
  is_alarm BOOLEAN DEFAULT false,
  alarm_type TEXT CHECK (alarm_type IN ('low_pressure', 'high_pressure', 'high_temperature', 'rapid_leak', 'sensor_fault')),
  battery_percent INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tpms_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org tpms readings"
  ON public.tpms_readings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org tpms readings"
  ON public.tpms_readings FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_tpms_org ON public.tpms_readings(organization_id);
CREATE INDEX idx_tpms_vehicle ON public.tpms_readings(vehicle_id, recorded_at DESC);

-- 5. Driver Identification Events
CREATE TABLE public.driver_id_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  sensor_id UUID REFERENCES public.iot_sensors(id),
  auth_method TEXT NOT NULL CHECK (auth_method IN ('ibutton', 'ble_tag', 'rfid', 'nfc', 'facial', 'fingerprint')),
  tag_id TEXT, -- iButton serial, BLE MAC, RFID UID
  event_type TEXT NOT NULL DEFAULT 'login' CHECK (event_type IN ('login', 'logout', 'rejected', 'unknown_tag')),
  authenticated BOOLEAN DEFAULT false,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_id_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org driver id events"
  ON public.driver_id_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org driver id events"
  ON public.driver_id_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_driver_id_events_org ON public.driver_id_events(organization_id);
CREATE INDEX idx_driver_id_events_vehicle ON public.driver_id_events(vehicle_id, event_time DESC);

-- Enable realtime for panic button (emergency)
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_button_events;
