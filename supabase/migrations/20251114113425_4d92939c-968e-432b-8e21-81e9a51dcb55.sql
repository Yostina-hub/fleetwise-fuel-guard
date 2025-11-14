-- Create offline device alert configuration table
CREATE TABLE IF NOT EXISTS device_offline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  offline_threshold_minutes INTEGER NOT NULL DEFAULT 5,
  notification_emails TEXT[] NOT NULL,
  notification_sms TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE device_offline_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org offline alerts"
  ON device_offline_alerts FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can manage offline alerts"
  ON device_offline_alerts FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'operations_manager'::app_role))
  );

-- Create device offline events log
CREATE TABLE IF NOT EXISTS device_offline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  device_id UUID NOT NULL REFERENCES devices(id),
  vehicle_id UUID REFERENCES vehicles(id),
  offline_since TIMESTAMP WITH TIME ZONE NOT NULL,
  back_online_at TIMESTAMP WITH TIME ZONE,
  offline_duration_minutes INTEGER,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE device_offline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view offline events in their org"
  ON device_offline_events FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can create offline events"
  ON device_offline_events FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "System can update offline events"
  ON device_offline_events FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_device_offline_alerts_updated_at
  BEFORE UPDATE ON device_offline_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();