-- Create vehicle restricted hours configuration table
CREATE TABLE public.vehicle_restricted_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  allowed_start_time TIME NOT NULL DEFAULT '00:00:00',
  allowed_end_time TIME NOT NULL DEFAULT '23:59:59',
  active_days INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 1=Monday, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT,
  UNIQUE(vehicle_id)
);

-- Create restricted hours violations log table
CREATE TABLE public.restricted_hours_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  restriction_id UUID REFERENCES public.vehicle_restricted_hours(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  violation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  allowed_start_time TIME NOT NULL,
  allowed_end_time TIME NOT NULL,
  actual_time TIME NOT NULL,
  duration_minutes INTEGER,
  start_location TEXT,
  end_location TEXT,
  distance_km NUMERIC,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_restricted_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restricted_hours_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_restricted_hours
CREATE POLICY "Users can view restricted hours for their organization"
ON public.vehicle_restricted_hours
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage restricted hours for their organization"
ON public.vehicle_restricted_hours
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create RLS policies for restricted_hours_violations
CREATE POLICY "Users can view violations for their organization"
ON public.restricted_hours_violations
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage violations for their organization"
ON public.restricted_hours_violations
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_vehicle_restricted_hours_vehicle_id ON public.vehicle_restricted_hours(vehicle_id);
CREATE INDEX idx_vehicle_restricted_hours_org_id ON public.vehicle_restricted_hours(organization_id);
CREATE INDEX idx_restricted_hours_violations_vehicle_id ON public.restricted_hours_violations(vehicle_id);
CREATE INDEX idx_restricted_hours_violations_org_id ON public.restricted_hours_violations(organization_id);
CREATE INDEX idx_restricted_hours_violations_time ON public.restricted_hours_violations(violation_time);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_restricted_hours_updated_at
BEFORE UPDATE ON public.vehicle_restricted_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();