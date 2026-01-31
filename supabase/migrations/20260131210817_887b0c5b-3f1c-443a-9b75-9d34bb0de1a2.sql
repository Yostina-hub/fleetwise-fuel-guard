
-- Add speed_kmh column to geofence_events for speed violation tracking
ALTER TABLE public.geofence_events 
ADD COLUMN IF NOT EXISTS speed_kmh numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.geofence_events.speed_kmh IS 'Actual speed at time of event, used for speed violations';
