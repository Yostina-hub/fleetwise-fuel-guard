-- Create penalty configurations table (admin configurable)
CREATE TABLE public.penalty_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL, -- 'overspeed', 'geofence_exit', 'geofence_entry_unauthorized'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  penalty_points INTEGER NOT NULL DEFAULT 0,
  monetary_fine NUMERIC DEFAULT 0,
  warning_count_before_suspension INTEGER DEFAULT 3,
  suspension_days INTEGER DEFAULT 0,
  auto_apply BOOLEAN DEFAULT true,
  speed_threshold_kmh INTEGER DEFAULT 10, -- for overspeed: how much over limit triggers penalty
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, violation_type, severity)
);

-- Create driver penalties table (actual penalties applied)
CREATE TABLE public.driver_penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  penalty_config_id UUID REFERENCES public.penalty_configurations(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  penalty_points INTEGER NOT NULL DEFAULT 0,
  monetary_fine NUMERIC DEFAULT 0,
  violation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  violation_details JSONB DEFAULT '{}',
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  speed_kmh NUMERIC,
  speed_limit_kmh NUMERIC,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  geofence_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'appealed', 'dismissed', 'paid'
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  is_auto_applied BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver penalty summary view
CREATE TABLE public.driver_penalty_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  total_penalty_points INTEGER NOT NULL DEFAULT 0,
  total_fines NUMERIC NOT NULL DEFAULT 0,
  total_violations INTEGER NOT NULL DEFAULT 0,
  overspeed_count INTEGER NOT NULL DEFAULT 0,
  geofence_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  suspension_count INTEGER NOT NULL DEFAULT 0,
  is_suspended BOOLEAN DEFAULT false,
  suspension_start_date DATE,
  suspension_end_date DATE,
  last_violation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, driver_id)
);

-- Enable RLS
ALTER TABLE public.penalty_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_penalty_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for penalty_configurations
CREATE POLICY "Users can view penalty configs in their org"
ON public.penalty_configurations FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage penalty configs"
ON public.penalty_configurations FOR ALL
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin')
);

-- RLS Policies for driver_penalties
CREATE POLICY "Users can view penalties in their org"
ON public.driver_penalties FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can create penalties"
ON public.driver_penalties FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Managers can update penalties"
ON public.driver_penalties FOR UPDATE
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
);

-- RLS Policies for driver_penalty_summary
CREATE POLICY "Users can view penalty summary in their org"
ON public.driver_penalty_summary FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can manage penalty summary"
ON public.driver_penalty_summary FOR ALL
USING (organization_id = get_user_organization(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_driver_penalties_driver ON public.driver_penalties(driver_id);
CREATE INDEX idx_driver_penalties_org ON public.driver_penalties(organization_id);
CREATE INDEX idx_driver_penalties_status ON public.driver_penalties(status);
CREATE INDEX idx_driver_penalties_time ON public.driver_penalties(violation_time DESC);
CREATE INDEX idx_penalty_configs_org ON public.penalty_configurations(organization_id);

-- Triggers for updated_at
CREATE TRIGGER update_penalty_configurations_updated_at
BEFORE UPDATE ON public.penalty_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_penalties_updated_at
BEFORE UPDATE ON public.driver_penalties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_penalty_summary_updated_at
BEFORE UPDATE ON public.driver_penalty_summary
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default penalty configurations for new organizations
INSERT INTO public.penalty_configurations (organization_id, violation_type, severity, penalty_points, monetary_fine, speed_threshold_kmh, description)
SELECT 
  id,
  violation_type,
  severity,
  penalty_points,
  monetary_fine,
  speed_threshold,
  description
FROM public.organizations
CROSS JOIN (
  VALUES 
    ('overspeed', 'low', 5, 50, 10, 'Minor speeding (10-20 km/h over limit)'),
    ('overspeed', 'medium', 10, 100, 20, 'Moderate speeding (20-30 km/h over limit)'),
    ('overspeed', 'high', 20, 200, 30, 'Severe speeding (30-40 km/h over limit)'),
    ('overspeed', 'critical', 50, 500, 40, 'Dangerous speeding (40+ km/h over limit)'),
    ('geofence_exit', 'low', 5, 50, NULL, 'Unauthorized geofence exit - minor'),
    ('geofence_exit', 'medium', 10, 100, NULL, 'Unauthorized geofence exit - moderate'),
    ('geofence_exit', 'high', 20, 200, NULL, 'Unauthorized geofence exit - severe'),
    ('geofence_entry_unauthorized', 'medium', 10, 100, NULL, 'Entry into restricted zone')
) AS defaults(violation_type, severity, penalty_points, monetary_fine, speed_threshold, description)
ON CONFLICT DO NOTHING;