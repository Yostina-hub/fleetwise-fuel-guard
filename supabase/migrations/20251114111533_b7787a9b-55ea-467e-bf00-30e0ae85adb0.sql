-- Create driver behavior scores table
CREATE TABLE public.driver_behavior_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  score_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  score_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  safety_rating TEXT NOT NULL CHECK (safety_rating IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  
  -- Metric scores (0-100)
  speeding_score INTEGER NOT NULL DEFAULT 100,
  braking_score INTEGER NOT NULL DEFAULT 100,
  acceleration_score INTEGER NOT NULL DEFAULT 100,
  idle_score INTEGER NOT NULL DEFAULT 100,
  
  -- Violation counts
  speed_violations INTEGER NOT NULL DEFAULT 0,
  harsh_braking_events INTEGER NOT NULL DEFAULT 0,
  harsh_acceleration_events INTEGER NOT NULL DEFAULT 0,
  
  -- Time metrics (in seconds)
  total_drive_time INTEGER NOT NULL DEFAULT 0,
  total_idle_time INTEGER NOT NULL DEFAULT 0,
  
  -- Distance
  total_distance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- AI insights
  risk_factors TEXT[],
  recommendations TEXT[],
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_behavior_scores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's driver scores"
ON public.driver_behavior_scores
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert driver scores"
ON public.driver_behavior_scores
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update driver scores"
ON public.driver_behavior_scores
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_driver_behavior_scores_driver ON public.driver_behavior_scores(driver_id);
CREATE INDEX idx_driver_behavior_scores_vehicle ON public.driver_behavior_scores(vehicle_id);
CREATE INDEX idx_driver_behavior_scores_period ON public.driver_behavior_scores(score_period_start, score_period_end);
CREATE INDEX idx_driver_behavior_scores_org ON public.driver_behavior_scores(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_driver_behavior_scores_updated_at
BEFORE UPDATE ON public.driver_behavior_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for latest driver scores
CREATE VIEW public.latest_driver_scores AS
SELECT DISTINCT ON (driver_id) *
FROM public.driver_behavior_scores
ORDER BY driver_id, score_period_end DESC;