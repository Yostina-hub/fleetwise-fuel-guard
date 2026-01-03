-- Create device command queue table for sending commands to devices
CREATE TABLE public.device_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  command_type TEXT NOT NULL, -- 'speed_limit', 'reboot', 'config', 'locate', 'engine_cut', 'engine_restore', 'geofence', 'interval'
  command_payload JSONB NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'executed', 'failed', 'expired'
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their org device commands"
  ON public.device_commands FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create device commands"
  ON public.device_commands FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their org device commands"
  ON public.device_commands FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_device_commands_device_id ON public.device_commands(device_id);
CREATE INDEX idx_device_commands_status ON public.device_commands(status);
CREATE INDEX idx_device_commands_pending ON public.device_commands(device_id, status) WHERE status = 'pending';
CREATE INDEX idx_device_commands_created_at ON public.device_commands(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_device_commands_updated_at
  BEFORE UPDATE ON public.device_commands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add rate limiting table for devices
CREATE TABLE public.device_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id, window_start)
);

-- Enable RLS
ALTER TABLE public.device_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits (service role access only typically)
CREATE POLICY "Service role access for rate limits"
  ON public.device_rate_limits FOR ALL
  USING (true);

-- Index for rate limit lookups
CREATE INDEX idx_device_rate_limits_lookup ON public.device_rate_limits(device_id, window_start DESC);