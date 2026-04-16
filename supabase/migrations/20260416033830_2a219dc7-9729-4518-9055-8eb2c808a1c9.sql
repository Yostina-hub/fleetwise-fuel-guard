
-- Two-Factor Authentication settings
CREATE TABLE public.two_factor_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  method TEXT NOT NULL DEFAULT 'totp',
  secret_encrypted TEXT,
  backup_codes JSONB,
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.two_factor_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own 2FA settings
CREATE POLICY "Users can view own 2FA" ON public.two_factor_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can manage their own 2FA settings
CREATE POLICY "Users can insert own 2FA" ON public.two_factor_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA" ON public.two_factor_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Org admins can view 2FA status for org members
CREATE POLICY "Admins can view org 2FA" ON public.two_factor_settings
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'org_admin')
    )
  );

CREATE TRIGGER update_two_factor_settings_updated_at
  BEFORE UPDATE ON public.two_factor_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
