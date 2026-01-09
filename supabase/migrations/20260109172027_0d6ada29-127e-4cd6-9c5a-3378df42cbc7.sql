-- Add SMS gateway configuration to organization settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS sms_gateway_config JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.organization_settings.sms_gateway_config IS 'SMS gateway configuration including provider, API keys, and sender ID';