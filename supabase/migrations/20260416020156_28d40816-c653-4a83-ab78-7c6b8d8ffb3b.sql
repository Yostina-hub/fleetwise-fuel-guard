
-- Create device_compatibility_profiles table
CREATE TABLE public.device_compatibility_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  model_name TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  supported_commands TEXT[] DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',
  telemetry_fields TEXT[] DEFAULT '{}',
  setup_config JSONB DEFAULT '{}',
  command_templates JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, vendor, model_name)
);

-- Enable RLS
ALTER TABLE public.device_compatibility_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view compatibility profiles in their org"
ON public.device_compatibility_profiles FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create compatibility profiles in their org"
ON public.device_compatibility_profiles FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update compatibility profiles in their org"
ON public.device_compatibility_profiles FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete compatibility profiles in their org"
ON public.device_compatibility_profiles FOR DELETE TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_device_compatibility_profiles_updated_at
BEFORE UPDATE ON public.device_compatibility_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add compatibility_profile_id to devices table
ALTER TABLE public.devices
ADD COLUMN compatibility_profile_id UUID REFERENCES public.device_compatibility_profiles(id) ON DELETE SET NULL;

-- Rate limit trigger
CREATE TRIGGER rate_limit_inserts_device_compatibility_profiles
BEFORE INSERT ON public.device_compatibility_profiles
FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();
