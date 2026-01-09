-- Create driver wellness checks table
CREATE TABLE public.driver_wellness_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  check_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Self-assessment fields
  fatigue_level INTEGER NOT NULL CHECK (fatigue_level >= 1 AND fatigue_level <= 5), -- 1=Alert, 5=Very Tired
  hours_slept NUMERIC(3,1), -- Hours of sleep in last 24h
  sobriety_confirmed BOOLEAN NOT NULL DEFAULT false,
  feeling_well BOOLEAN NOT NULL DEFAULT true,
  
  -- Optional notes
  notes TEXT,
  
  -- Location of check
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  
  -- Result
  is_fit_to_drive BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  
  -- Supervisor review (if flagged)
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_wellness_checks ENABLE ROW LEVEL SECURITY;

-- Policies for drivers to create their own checks
CREATE POLICY "Drivers can create their own wellness checks"
ON public.driver_wellness_checks
FOR INSERT
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Drivers can view their own checks
CREATE POLICY "Drivers can view their own wellness checks"
ON public.driver_wellness_checks
FOR SELECT
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR organization_id = get_user_organization(auth.uid())
);

-- Organization members can view all checks in their org
CREATE POLICY "Org members can view wellness checks"
ON public.driver_wellness_checks
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

-- Supervisors can update (review) checks
CREATE POLICY "Supervisors can review wellness checks"
ON public.driver_wellness_checks
FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Create indexes
CREATE INDEX idx_wellness_checks_driver ON public.driver_wellness_checks(driver_id, check_time DESC);
CREATE INDEX idx_wellness_checks_org ON public.driver_wellness_checks(organization_id, check_time DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_driver_wellness_checks_updated_at
BEFORE UPDATE ON public.driver_wellness_checks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_wellness_checks;