
-- Billing integration configuration
CREATE TABLE public.billing_integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'custom_erp',
  api_endpoint TEXT NOT NULL DEFAULT '',
  auth_type TEXT NOT NULL DEFAULT 'bearer',
  sync_interval_minutes INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT false,
  billable_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org billing configs"
  ON public.billing_integration_configs
  FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_billing_integration_configs_updated_at
  BEFORE UPDATE ON public.billing_integration_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Billing sync events / history
CREATE TABLE public.billing_sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.billing_integration_configs(id) ON DELETE SET NULL,
  event_description TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ETB',
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org billing events"
  ON public.billing_sync_events
  FOR ALL
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
