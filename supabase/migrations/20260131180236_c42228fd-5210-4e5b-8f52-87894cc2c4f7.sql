-- Create device_terminal_settings table to persist terminal configuration per device
CREATE TABLE public.device_terminal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  
  -- Device Configuration
  timezone TEXT DEFAULT 'E03',
  sms_password TEXT DEFAULT '123456',
  auth_number TEXT,
  
  -- Fuel & Mileage
  tank_volume NUMERIC DEFAULT 60,
  oil_calibration NUMERIC DEFAULT 100,
  initial_mileage NUMERIC DEFAULT 0,
  unit_system TEXT DEFAULT 'metric',
  
  -- Alerts & Sensitivity
  acc_notify_on BOOLEAN DEFAULT true,
  acc_notify_off BOOLEAN DEFAULT true,
  turning_angle INTEGER DEFAULT 30,
  alarm_send_times INTEGER DEFAULT 3,
  sensitivity INTEGER DEFAULT 5,
  
  -- Connectivity & System
  speaker_enabled BOOLEAN DEFAULT true,
  bluetooth_enabled BOOLEAN DEFAULT true,
  
  -- Alarm Settings
  alarm_sos BOOLEAN DEFAULT true,
  alarm_vibration BOOLEAN DEFAULT true,
  alarm_power_cut BOOLEAN DEFAULT true,
  alarm_low_battery BOOLEAN DEFAULT true,
  alarm_overspeed BOOLEAN DEFAULT false,
  alarm_geofence BOOLEAN DEFAULT true,
  
  -- Driving Behavior Thresholds
  harsh_braking_threshold INTEGER DEFAULT 50,
  harsh_acceleration_threshold INTEGER DEFAULT 50,
  sharp_turn_threshold INTEGER DEFAULT 50,
  idling_threshold INTEGER DEFAULT 50,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_device_settings UNIQUE (device_id)
);

-- Enable RLS
ALTER TABLE public.device_terminal_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's device settings"
ON public.device_terminal_settings FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert device settings for their organization"
ON public.device_terminal_settings FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their organization's device settings"
ON public.device_terminal_settings FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete their organization's device settings"
ON public.device_terminal_settings FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_device_terminal_settings_updated_at
BEFORE UPDATE ON public.device_terminal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();