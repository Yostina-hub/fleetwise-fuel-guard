
-- LDAP/AD Integration Config table
CREATE TABLE public.ldap_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'LDAP Directory',
  server_url TEXT NOT NULL,
  bind_dn TEXT,
  base_dn TEXT NOT NULL,
  search_filter TEXT DEFAULT '(objectClass=user)',
  user_attributes JSONB DEFAULT '{"username": "sAMAccountName", "email": "mail", "fullName": "cn", "phone": "telephoneNumber"}'::jsonb,
  tls_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ldap_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage LDAP configs" ON public.ldap_configs
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

-- LDAP Sync History
CREATE TABLE public.ldap_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  ldap_config_id UUID REFERENCES public.ldap_configs(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  users_synced INTEGER DEFAULT 0,
  users_created INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_skipped INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ldap_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view LDAP sync logs" ON public.ldap_sync_logs
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

-- SIEM Forwarding Config
CREATE TABLE public.siem_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'SIEM Endpoint',
  endpoint_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'bearer',
  auth_token TEXT,
  format TEXT NOT NULL DEFAULT 'json',
  event_types TEXT[] DEFAULT ARRAY['auth', 'data_access', 'admin_action', 'security']::TEXT[],
  batch_size INTEGER DEFAULT 100,
  forward_interval_seconds INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  last_forward_at TIMESTAMPTZ,
  last_forward_status TEXT,
  last_forward_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.siem_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage SIEM configs" ON public.siem_configs
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

-- SIEM Forwarding Log
CREATE TABLE public.siem_forward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  siem_config_id UUID REFERENCES public.siem_configs(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  events_forwarded INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.siem_forward_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view SIEM logs" ON public.siem_forward_logs
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));

-- ERP Webhook Bridge Config
CREATE TABLE public.erp_webhook_bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'bearer',
  auth_token TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  transform_template JSONB,
  headers JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_webhook_bridges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage ERP bridges" ON public.erp_webhook_bridges
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()) OR public.is_super_admin(auth.uid()));
