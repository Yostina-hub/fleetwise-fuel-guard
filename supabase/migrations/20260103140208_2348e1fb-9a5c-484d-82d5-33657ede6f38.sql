-- Create SMS gateway configuration table
CREATE TABLE public.sms_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'africastalking', -- africastalking, twilio, nexmo
  api_key TEXT NOT NULL,
  api_secret TEXT, -- For providers that need it
  sender_id TEXT, -- Alphanumeric sender ID
  username TEXT, -- For Africa's Talking
  environment TEXT DEFAULT 'sandbox', -- sandbox or production
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_gateway_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view SMS config for their organization" 
ON public.sms_gateway_config 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage SMS config" 
ON public.sms_gateway_config 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'fleet_owner')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_sms_gateway_config_updated_at
BEFORE UPDATE ON public.sms_gateway_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_sms_gateway_config_org ON public.sms_gateway_config(organization_id, is_active);