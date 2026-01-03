-- Add extended telemetry fields for advanced device data
ALTER TABLE public.vehicle_telemetry 
ADD COLUMN IF NOT EXISTS engine_hours numeric,
ADD COLUMN IF NOT EXISTS battery_voltage numeric,
ADD COLUMN IF NOT EXISTS external_voltage numeric,
ADD COLUMN IF NOT EXISTS gsm_signal_strength integer,
ADD COLUMN IF NOT EXISTS temperature_1 numeric,
ADD COLUMN IF NOT EXISTS temperature_2 numeric,
ADD COLUMN IF NOT EXISTS driver_rfid text,
ADD COLUMN IF NOT EXISTS harsh_acceleration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS harsh_braking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS harsh_cornering boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dtc_codes jsonb,
ADD COLUMN IF NOT EXISTS can_data jsonb,
ADD COLUMN IF NOT EXISTS io_elements jsonb;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_engine_hours ON vehicle_telemetry(vehicle_id, engine_hours) WHERE engine_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_driver_rfid ON vehicle_telemetry(driver_rfid) WHERE driver_rfid IS NOT NULL;