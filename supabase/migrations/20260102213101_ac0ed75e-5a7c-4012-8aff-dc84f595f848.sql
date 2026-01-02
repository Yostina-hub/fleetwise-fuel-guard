-- Add missing columns to geofence_events table for speed violations and dwell time
ALTER TABLE public.geofence_events 
ADD COLUMN IF NOT EXISTS speed_limit_kmh numeric,
ADD COLUMN IF NOT EXISTS dwell_time_minutes integer;

-- Create vehicle_geofence_states table to track which vehicles are currently in which geofences
CREATE TABLE IF NOT EXISTS public.vehicle_geofence_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, geofence_id)
);

-- Enable RLS
ALTER TABLE public.vehicle_geofence_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view vehicle geofence states in their organization"
ON public.vehicle_geofence_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.profiles p ON p.organization_id = v.organization_id
    WHERE v.id = vehicle_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Service role can manage vehicle geofence states"
ON public.vehicle_geofence_states
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_states_vehicle ON public.vehicle_geofence_states(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_states_geofence ON public.vehicle_geofence_states(geofence_id);