-- Identity Provider Configurations for AD/Oracle IDCS/SSO integrations
-- Configurable from the frontend admin UI by super_admin / org_admin

CREATE TABLE public.identity_provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('oracle_idcs','azure_ad','active_directory','saml','oidc','okta','ping')),
  display_name TEXT NOT NULL,
  metadata_url TEXT,
  entity_id TEXT,
  sso_url TEXT,
  client_id TEXT,
  -- client_secret intentionally NOT stored here; use Lovable Cloud secrets
  client_secret_ref TEXT, -- name of the secret in Cloud secrets (e.g. ORACLE_IDCS_CLIENT_SECRET)
  domains TEXT[] NOT NULL DEFAULT '{}',
  attribute_mapping JSONB NOT NULL DEFAULT '{
    "email": "email",
    "full_name": "name",
    "first_name": "given_name",
    "last_name": "family_name",
    "groups": "groups",
    "department": "department"
  }'::jsonb,
  role_mapping JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"AD_Group_Name": "fleet_manager"}
  default_role TEXT DEFAULT 'driver',
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_provision_users BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_idp_configs_org ON public.identity_provider_configs(organization_id);
CREATE INDEX idx_idp_configs_active ON public.identity_provider_configs(is_active) WHERE is_active = true;
CREATE INDEX idx_idp_configs_domains ON public.identity_provider_configs USING GIN(domains);

ALTER TABLE public.identity_provider_configs ENABLE ROW LEVEL SECURITY;

-- Super admins: full access
CREATE POLICY "Super admins manage all IdP configs"
ON public.identity_provider_configs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Org admins: scoped to their org
CREATE POLICY "Org admins view their org IdP configs"
ON public.identity_provider_configs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org admins insert their org IdP configs"
ON public.identity_provider_configs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org admins update their org IdP configs"
ON public.identity_provider_configs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org admins delete their org IdP configs"
ON public.identity_provider_configs
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- updated_at trigger
CREATE TRIGGER set_idp_configs_updated_at
BEFORE UPDATE ON public.identity_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- SSO Login Audit (track who came in via which IdP)
CREATE TABLE public.sso_login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  provider_config_id UUID REFERENCES public.identity_provider_configs(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','failure','pending_provision')),
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  raw_attributes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sso_events_user ON public.sso_login_events(user_id);
CREATE INDEX idx_sso_events_provider ON public.sso_login_events(provider_config_id);
CREATE INDEX idx_sso_events_created ON public.sso_login_events(created_at DESC);

ALTER TABLE public.sso_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all SSO events"
ON public.sso_login_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org admins view their org SSO events"
ON public.sso_login_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND provider_config_id IN (
    SELECT id FROM public.identity_provider_configs
    WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Service role inserts SSO events"
ON public.sso_login_events
FOR INSERT
TO authenticated
WITH CHECK (true);
