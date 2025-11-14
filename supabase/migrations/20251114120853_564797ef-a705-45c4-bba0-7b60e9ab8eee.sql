
-- Add GPS signal quality fields to vehicle_telemetry table
ALTER TABLE public.vehicle_telemetry
ADD COLUMN IF NOT EXISTS gps_satellites_count INTEGER,
ADD COLUMN IF NOT EXISTS gps_signal_strength INTEGER CHECK (gps_signal_strength >= 0 AND gps_signal_strength <= 100),
ADD COLUMN IF NOT EXISTS gps_hdop NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS gps_fix_type TEXT CHECK (gps_fix_type IN ('no_fix', '2d_fix', '3d_fix'));

-- Add comment for documentation
COMMENT ON COLUMN public.vehicle_telemetry.gps_satellites_count IS 'Number of satellites in view';
COMMENT ON COLUMN public.vehicle_telemetry.gps_signal_strength IS 'GPS signal strength percentage (0-100)';
COMMENT ON COLUMN public.vehicle_telemetry.gps_hdop IS 'Horizontal Dilution of Precision - lower is better (1-50)';
COMMENT ON COLUMN public.vehicle_telemetry.gps_fix_type IS 'Type of GPS fix: no_fix, 2d_fix (lat/lng only), 3d_fix (lat/lng/altitude)';
