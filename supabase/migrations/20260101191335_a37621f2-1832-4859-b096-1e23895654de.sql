-- 1. Add emergency contact and medical info to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS medical_info jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS medical_certificate_expiry date;

-- 2. Create driver_shift_schedules table
CREATE TABLE IF NOT EXISTS public.driver_shift_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(driver_id, day_of_week)
);

ALTER TABLE public.driver_shift_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift schedules in their org"
  ON public.driver_shift_schedules FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage shift schedules"
  ON public.driver_shift_schedules FOR ALL
  USING (organization_id = get_user_organization(auth.uid()) 
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'dispatcher')));

-- 3. Add geofence schedule fields
ALTER TABLE public.geofences
ADD COLUMN IF NOT EXISTS schedule_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_start_time time,
ADD COLUMN IF NOT EXISTS schedule_end_time time,
ADD COLUMN IF NOT EXISTS schedule_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];

-- 4. Add trip type (business/personal) to trips
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'business' CHECK (trip_type IN ('business', 'personal', 'commute')),
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS exception_notes text;

-- 5. Create coaching acknowledgements table
CREATE TABLE IF NOT EXISTS public.driver_coaching_acknowledgements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  score_id uuid REFERENCES public.driver_behavior_scores(id) ON DELETE SET NULL,
  coaching_note text NOT NULL,
  acknowledged_at timestamp with time zone,
  acknowledgement_method text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_coaching_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view coaching acknowledgements in their org"
  ON public.driver_coaching_acknowledgements FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Managers can manage coaching acknowledgements"
  ON public.driver_coaching_acknowledgements FOR ALL
  USING (organization_id = get_user_organization(auth.uid()) 
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'fleet_owner')));

-- 6. Add GPS jamming detection to vehicle_telemetry
ALTER TABLE public.vehicle_telemetry
ADD COLUMN IF NOT EXISTS gps_jamming_detected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gps_spoofing_detected boolean DEFAULT false;

-- 7. Create SOS/Panic alerts table for quick access
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  alert_time timestamp with time zone NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  location_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm')),
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SOS alerts in their org"
  ON public.sos_alerts FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can create SOS alerts"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update SOS alerts in their org"
  ON public.sos_alerts FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

-- Add realtime for SOS alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- Create index for fast nearby vehicle searches
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_location 
  ON public.vehicle_telemetry (organization_id, latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add trigger to update updated_at on driver_shift_schedules
CREATE TRIGGER update_driver_shift_schedules_updated_at
  BEFORE UPDATE ON public.driver_shift_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();