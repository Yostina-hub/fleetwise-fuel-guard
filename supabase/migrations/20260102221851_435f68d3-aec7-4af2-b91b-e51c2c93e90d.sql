-- Create speed_limit_zones table for zone-based speed limits
CREATE TABLE IF NOT EXISTS public.speed_limit_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  zone_type TEXT NOT NULL DEFAULT 'custom', -- school, construction, highway, urban, custom
  speed_limit_kmh INTEGER NOT NULL DEFAULT 50,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  start_time TIME, -- For time-based zones
  end_time TIME,
  days_active INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.speed_limit_zones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view speed limit zones in their org"
  ON public.speed_limit_zones
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage speed limit zones"
  ON public.speed_limit_zones
  FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) 
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- Create indexes
CREATE INDEX idx_speed_limit_zones_org ON public.speed_limit_zones(organization_id);
CREATE INDEX idx_speed_limit_zones_geofence ON public.speed_limit_zones(geofence_id);

-- Create trigger for updated_at
CREATE TRIGGER update_speed_limit_zones_updated_at
  BEFORE UPDATE ON public.speed_limit_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();