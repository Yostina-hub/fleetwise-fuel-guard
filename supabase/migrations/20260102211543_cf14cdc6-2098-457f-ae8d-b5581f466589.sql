-- Add missing alert and configuration columns to geofences table
ALTER TABLE public.geofences 
ADD COLUMN IF NOT EXISTS speed_limit numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enable_entry_alarm boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_exit_alarm boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_speed_alarm boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_dwell_minutes integer DEFAULT NULL;