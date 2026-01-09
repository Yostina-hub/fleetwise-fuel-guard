-- Add alert rule types for speed bypass, maintenance, and fuel
-- These extend the existing alert_rules system

-- Create fuel alert thresholds table
CREATE TABLE IF NOT EXISTS public.fuel_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  
  -- Low fuel alert
  low_fuel_threshold_percent INTEGER DEFAULT 20,
  low_fuel_alert_enabled BOOLEAN DEFAULT true,
  
  -- Fuel theft detection
  fuel_theft_threshold_liters NUMERIC(6,2) DEFAULT 10,
  fuel_theft_alert_enabled BOOLEAN DEFAULT true,
  
  -- Unusual consumption
  consumption_variance_percent INTEGER DEFAULT 30,
  consumption_alert_enabled BOOLEAN DEFAULT true,
  
  -- Refueling alerts
  refueling_alert_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, vehicle_id)
);

-- Enable RLS
ALTER TABLE public.fuel_alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view fuel settings"
ON public.fuel_alert_settings FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can manage fuel settings"
ON public.fuel_alert_settings FOR ALL
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Create maintenance alert settings
CREATE TABLE IF NOT EXISTS public.maintenance_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Days before maintenance to alert
  days_before_alert INTEGER DEFAULT 7,
  
  -- Enable alerts
  upcoming_maintenance_enabled BOOLEAN DEFAULT true,
  overdue_maintenance_enabled BOOLEAN DEFAULT true,
  
  -- Notification channels
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.maintenance_alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view maintenance settings"
ON public.maintenance_alert_settings FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can manage maintenance settings"
ON public.maintenance_alert_settings FOR ALL
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Add speed_governor_bypass_alert to vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS speed_governor_bypass_alert BOOLEAN DEFAULT true;

-- Create speed governor events log for bypass detection
CREATE TABLE IF NOT EXISTS public.speed_governor_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  
  event_type VARCHAR(50) NOT NULL, -- 'bypass_detected', 'governor_disabled', 'limit_exceeded', 'governor_restored'
  event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Details
  speed_at_event NUMERIC(6,2),
  speed_limit_set NUMERIC(6,2),
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  location_name TEXT,
  
  -- Alert generated
  alert_id UUID REFERENCES public.alerts(id),
  
  -- Resolution
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.speed_governor_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view governor events"
ON public.speed_governor_events FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can insert governor events"
ON public.speed_governor_events FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can update governor events"
ON public.speed_governor_events FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_speed_gov_events_vehicle ON public.speed_governor_events(vehicle_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_speed_gov_events_type ON public.speed_governor_events(event_type, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_settings_org ON public.fuel_alert_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_settings_org ON public.maintenance_alert_settings(organization_id);

-- Enable realtime for speed governor events
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_governor_events;