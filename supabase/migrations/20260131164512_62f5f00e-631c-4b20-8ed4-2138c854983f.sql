-- Add engine lock setting to restricted hours
ALTER TABLE public.vehicle_restricted_hours
ADD COLUMN IF NOT EXISTS engine_lock_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_delay_seconds integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS send_warning_first boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS warning_message text DEFAULT 'Vehicle operating outside allowed hours. Engine will be disabled.';

-- Create table to track restricted hours violations
CREATE TABLE IF NOT EXISTS public.restricted_hours_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  config_id uuid REFERENCES public.vehicle_restricted_hours(id) ON DELETE SET NULL,
  violation_time timestamptz NOT NULL DEFAULT now(),
  day_of_week integer NOT NULL,
  allowed_start_time time NOT NULL,
  allowed_end_time time NOT NULL,
  actual_time time NOT NULL,
  lat numeric(10,7),
  lng numeric(10,7),
  location_name text,
  action_taken text, -- 'warning_sent', 'engine_locked', 'none'
  command_id uuid REFERENCES public.device_commands(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restricted_hours_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view org violations" ON public.restricted_hours_violations
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert org violations" ON public.restricted_hours_violations
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update org violations" ON public.restricted_hours_violations
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restricted_violations_vehicle ON public.restricted_hours_violations(vehicle_id, violation_time DESC);
CREATE INDEX IF NOT EXISTS idx_restricted_violations_org ON public.restricted_hours_violations(organization_id, violation_time DESC);