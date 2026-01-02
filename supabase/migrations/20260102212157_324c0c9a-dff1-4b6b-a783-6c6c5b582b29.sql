-- Add schedule configuration columns to geofences table
ALTER TABLE public.geofences 
ADD COLUMN IF NOT EXISTS schedule_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS active_days integer[] DEFAULT '{1,2,3,4,5}',
ADD COLUMN IF NOT EXISTS active_start_time text DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS active_end_time text DEFAULT '18:00';

-- Add comment for clarity
COMMENT ON COLUMN public.geofences.schedule_enabled IS 'Whether schedule-based monitoring is enabled';
COMMENT ON COLUMN public.geofences.active_days IS 'Array of active days (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.geofences.active_start_time IS 'Start time for schedule-based monitoring (HH:MM)';
COMMENT ON COLUMN public.geofences.active_end_time IS 'End time for schedule-based monitoring (HH:MM)';