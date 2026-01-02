-- Create speed governor configuration table
CREATE TABLE public.speed_governor_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  max_speed_limit INTEGER NOT NULL DEFAULT 80,
  governor_active BOOLEAN NOT NULL DEFAULT false,
  device_id TEXT,
  device_model TEXT,
  firmware_version TEXT,
  last_config_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id)
);

-- Create governor command logs table
CREATE TABLE public.governor_command_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  command_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create speed violations table for proper tracking
CREATE TABLE public.speed_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id),
  violation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  speed_kmh NUMERIC NOT NULL,
  speed_limit_kmh NUMERIC NOT NULL,
  duration_seconds INTEGER,
  lat NUMERIC,
  lng NUMERIC,
  location_name TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.speed_governor_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governor_command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies for speed_governor_config
CREATE POLICY "Users can view speed governor config in their org"
  ON public.speed_governor_config FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage speed governor config"
  ON public.speed_governor_config FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND 
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- RLS policies for governor_command_logs
CREATE POLICY "Users can view command logs in their org"
  ON public.governor_command_logs FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can create command logs"
  ON public.governor_command_logs FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization(auth.uid()) AND 
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

CREATE POLICY "Operations managers can update command logs"
  ON public.governor_command_logs FOR UPDATE
  USING (
    organization_id = get_user_organization(auth.uid()) AND 
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- RLS policies for speed_violations
CREATE POLICY "Users can view speed violations in their org"
  ON public.speed_violations FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can create speed violations"
  ON public.speed_violations FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update speed violations in their org"
  ON public.speed_violations FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_speed_governor_config_vehicle ON public.speed_governor_config(vehicle_id);
CREATE INDEX idx_speed_governor_config_org ON public.speed_governor_config(organization_id);
CREATE INDEX idx_governor_command_logs_vehicle ON public.governor_command_logs(vehicle_id);
CREATE INDEX idx_governor_command_logs_org ON public.governor_command_logs(organization_id);
CREATE INDEX idx_speed_violations_vehicle ON public.speed_violations(vehicle_id);
CREATE INDEX idx_speed_violations_org ON public.speed_violations(organization_id);
CREATE INDEX idx_speed_violations_time ON public.speed_violations(violation_time DESC);

-- Add updated_at trigger for speed_governor_config
CREATE TRIGGER update_speed_governor_config_updated_at
  BEFORE UPDATE ON public.speed_governor_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();