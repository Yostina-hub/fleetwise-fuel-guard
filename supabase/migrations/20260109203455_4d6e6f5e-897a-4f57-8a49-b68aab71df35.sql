-- Add driver verification fields
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS national_id_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_drivers_verification_status ON public.drivers(verification_status);

-- Add speed cutoff settings to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS speed_cutoff_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS speed_cutoff_limit_kmh INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS speed_cutoff_grace_seconds INTEGER DEFAULT 10;

-- Create overspeed cutoff events table
CREATE TABLE IF NOT EXISTS public.overspeed_cutoff_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  
  -- Event details
  event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  speed_kmh NUMERIC(6,2) NOT NULL,
  speed_limit_kmh INTEGER NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  
  -- Cutoff action
  cutoff_triggered BOOLEAN DEFAULT false,
  cutoff_command_id UUID REFERENCES public.device_commands(id),
  cutoff_reason TEXT,
  
  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.overspeed_cutoff_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for overspeed events
CREATE POLICY "Org members can view overspeed events"
ON public.overspeed_cutoff_events
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can insert overspeed events"
ON public.overspeed_cutoff_events
FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can update overspeed events"
ON public.overspeed_cutoff_events
FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_overspeed_events_vehicle ON public.overspeed_cutoff_events(vehicle_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_overspeed_events_org ON public.overspeed_cutoff_events(organization_id, event_time DESC);

-- Enable realtime for overspeed events
ALTER PUBLICATION supabase_realtime ADD TABLE public.overspeed_cutoff_events;