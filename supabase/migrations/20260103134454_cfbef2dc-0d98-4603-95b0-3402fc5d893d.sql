-- Create SMTP configuration table
CREATE TABLE public.smtp_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default SMTP',
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  smtp_from_email TEXT NOT NULL,
  smtp_from_name TEXT DEFAULT 'Fleet Management System',
  use_tls BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.smtp_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view SMTP configs in their organization"
ON public.smtp_configurations
FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create SMTP configs in their organization"
ON public.smtp_configurations
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update SMTP configs in their organization"
ON public.smtp_configurations
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete SMTP configs in their organization"
ON public.smtp_configurations
FOR DELETE
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_smtp_configurations_updated_at
BEFORE UPDATE ON public.smtp_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();