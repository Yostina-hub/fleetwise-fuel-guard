-- APIs & Integrations Infrastructure

-- Webhook Subscriptions
CREATE TABLE public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::jsonb,
  retry_config JSONB DEFAULT '{"max_retries": 3, "backoff_seconds": [60, 300, 900]}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Webhook Delivery Logs
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_subscription ON public.webhook_deliveries(subscription_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

-- External Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('erp', 'fuel_card', 'messaging', 'device', 'custom')),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT,
  sync_error TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Integration Sync Logs
CREATE TABLE public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_integration_sync_logs ON public.integration_sync_logs(integration_id, started_at DESC);

-- API Rate Limiting (for tracking API usage per key)
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, window_start)
);

CREATE INDEX idx_api_rate_limits_key_window ON public.api_rate_limits(api_key_id, window_start DESC);

-- Bulk Import/Export Jobs
CREATE TABLE public.bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('import', 'export')),
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  file_url TEXT,
  file_name TEXT,
  format TEXT NOT NULL CHECK (format IN ('csv', 'json', 'xlsx')),
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bulk_jobs_org_status ON public.bulk_jobs(organization_id, status, created_at DESC);

-- Enable RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_subscriptions
CREATE POLICY "Super admins can manage webhooks"
  ON public.webhook_subscriptions FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for webhook_deliveries
CREATE POLICY "Super admins can view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.webhook_subscriptions
      WHERE organization_id = get_user_organization(auth.uid())
    )
    AND has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "System can insert webhook deliveries"
  ON public.webhook_deliveries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update webhook deliveries"
  ON public.webhook_deliveries FOR UPDATE
  USING (true);

-- RLS Policies for integrations
CREATE POLICY "Super admins can manage integrations"
  ON public.integrations FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for integration_sync_logs
CREATE POLICY "Super admins can view sync logs"
  ON public.integration_sync_logs FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM public.integrations
      WHERE organization_id = get_user_organization(auth.uid())
    )
    AND has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for api_rate_limits
CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits FOR ALL
  USING (true);

-- RLS Policies for bulk_jobs
CREATE POLICY "Users can view their org bulk jobs"
  ON public.bulk_jobs FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage bulk jobs"
  ON public.bulk_jobs FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- Triggers for updated_at
CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to trigger webhooks
CREATE OR REPLACE FUNCTION public.trigger_webhook(
  _event_type TEXT,
  _event_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _subscription RECORD;
BEGIN
  -- Get user's organization
  _org_id := get_user_organization(auth.uid());
  
  IF _org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Find all active subscriptions for this event type
  FOR _subscription IN
    SELECT id, url, secret, headers
    FROM public.webhook_subscriptions
    WHERE organization_id = _org_id
      AND is_active = true
      AND _event_type = ANY(events)
  LOOP
    -- Create webhook delivery record
    INSERT INTO public.webhook_deliveries (
      subscription_id,
      event_type,
      event_data,
      status
    ) VALUES (
      _subscription.id,
      _event_type,
      _event_data,
      'pending'
    );
  END LOOP;
END;
$$;