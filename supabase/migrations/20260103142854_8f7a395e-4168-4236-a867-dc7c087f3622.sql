-- Add altitude column to vehicle_telemetry
ALTER TABLE public.vehicle_telemetry 
ADD COLUMN IF NOT EXISTS altitude_meters numeric;

-- Add device authentication token for secure device identification
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS auth_token text UNIQUE,
ADD COLUMN IF NOT EXISTS auth_token_created_at timestamp with time zone;

-- Add index for faster auth token lookups
CREATE INDEX IF NOT EXISTS idx_devices_auth_token ON public.devices(auth_token) WHERE auth_token IS NOT NULL;

-- Add odometer tracking to vehicle_telemetry
ALTER TABLE public.vehicle_telemetry
ADD COLUMN IF NOT EXISTS odometer_km numeric;

-- Add ignition state tracking for trip detection
ALTER TABLE public.vehicle_telemetry
ADD COLUMN IF NOT EXISTS ignition_on boolean;