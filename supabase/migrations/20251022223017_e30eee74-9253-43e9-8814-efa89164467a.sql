-- Administration Features

-- Organization settings for branding, locale, and configurations
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Branding & White-labeling
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0066cc',
  secondary_color TEXT DEFAULT '#333333',
  favicon_url TEXT,
  custom_domain TEXT,
  
  -- Localization
  default_language TEXT DEFAULT 'en', -- 'en', 'am' (Amharic), etc.
  default_timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  time_format TEXT DEFAULT '24h', -- '12h' or '24h'
  currency TEXT DEFAULT 'USD',
  distance_unit TEXT DEFAULT 'km', -- 'km' or 'mi'
  
  -- Email settings
  from_email TEXT,
  from_name TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  
  -- Feature flags
  enable_sso BOOLEAN DEFAULT false,
  enable_2fa BOOLEAN DEFAULT false,
  enforce_2fa BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT true,
  enable_mobile_access BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SSO configurations (SAML/OIDC)
CREATE TABLE public.sso_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, -- 'saml', 'oidc', 'google', 'microsoft', 'okta'
  is_active BOOLEAN DEFAULT false,
  
  -- SAML specific
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_certificate TEXT,
  
  -- OIDC specific
  oidc_client_id TEXT,
  oidc_client_secret TEXT,
  oidc_issuer_url TEXT,
  oidc_authorization_endpoint TEXT,
  oidc_token_endpoint TEXT,
  oidc_userinfo_endpoint TEXT,
  
  -- Common settings
  auto_provision_users BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'user',
  attribute_mapping JSONB, -- {email: 'email', name: 'displayName', ...}
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Password policies
CREATE TABLE public.password_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT false,
  
  password_expiry_days INTEGER, -- null = no expiry
  prevent_password_reuse INTEGER DEFAULT 3, -- last N passwords
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  
  session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
  session_absolute_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- IP Allowlists/Whitelists
CREATE TABLE public.ip_allowlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  ip_address INET NOT NULL, -- supports CIDR notation
  description TEXT,
  applies_to TEXT NOT NULL DEFAULT 'all', -- 'all', 'web', 'api', 'mobile'
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal Holds (for data retention compliance)
CREATE TABLE public.legal_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  hold_name TEXT NOT NULL,
  case_number TEXT,
  description TEXT NOT NULL,
  
  -- Scope
  hold_type TEXT NOT NULL, -- 'user', 'vehicle', 'date_range', 'all'
  scope_data JSONB, -- {user_ids: [], vehicle_ids: [], start_date, end_date}
  
  -- Affected data types
  data_types TEXT[], -- ['telemetry', 'trips', 'alerts', 'fuel_events', 'audit_logs']
  
  status TEXT DEFAULT 'active', -- 'active', 'released'
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2FA settings per user
CREATE TABLE public.user_2fa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  is_enabled BOOLEAN DEFAULT false,
  method TEXT, -- 'totp', 'sms', 'email'
  secret TEXT, -- encrypted TOTP secret
  backup_codes TEXT[], -- encrypted backup codes
  phone_number TEXT, -- for SMS 2FA
  
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Login history for security monitoring
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- 'web', 'mobile', 'api'
  location_country TEXT,
  location_city TEXT,
  
  status TEXT NOT NULL, -- 'success', 'failed', 'blocked', 'mfa_required'
  failure_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_allowlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_settings
CREATE POLICY "Users can view their org settings"
  ON public.organization_settings FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage org settings"
  ON public.organization_settings FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for sso_configurations
CREATE POLICY "Super admins can view SSO configs"
  ON public.sso_configurations FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage SSO configs"
  ON public.sso_configurations FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for password_policies
CREATE POLICY "Users can view their org password policies"
  ON public.password_policies FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage password policies"
  ON public.password_policies FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for ip_allowlists
CREATE POLICY "Super admins can view IP allowlists"
  ON public.ip_allowlists FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage IP allowlists"
  ON public.ip_allowlists FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for legal_holds
CREATE POLICY "Super admins can view legal holds"
  ON public.legal_holds FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage legal holds"
  ON public.legal_holds FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for user_2fa_settings
CREATE POLICY "Users can view their own 2FA settings"
  ON public.user_2fa_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own 2FA settings"
  ON public.user_2fa_settings FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for login_history
CREATE POLICY "Users can view their own login history"
  ON public.login_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert login history"
  ON public.login_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can view all login history"
  ON public.login_history FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    has_role(auth.uid(), 'super_admin')
  );

-- Create triggers for updated_at
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sso_configurations_updated_at
  BEFORE UPDATE ON public.sso_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_password_policies_updated_at
  BEFORE UPDATE ON public.password_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ip_allowlists_updated_at
  BEFORE UPDATE ON public.ip_allowlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_holds_updated_at
  BEFORE UPDATE ON public.legal_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_organization_settings_org ON public.organization_settings(organization_id);
CREATE INDEX idx_sso_configurations_org ON public.sso_configurations(organization_id);
CREATE INDEX idx_password_policies_org ON public.password_policies(organization_id);
CREATE INDEX idx_ip_allowlists_org ON public.ip_allowlists(organization_id);
CREATE INDEX idx_legal_holds_org ON public.legal_holds(organization_id);
CREATE INDEX idx_legal_holds_status ON public.legal_holds(status);
CREATE INDEX idx_user_2fa_settings_user ON public.user_2fa_settings(user_id);
CREATE INDEX idx_login_history_user ON public.login_history(user_id, login_time DESC);
CREATE INDEX idx_login_history_org ON public.login_history(organization_id, login_time DESC);