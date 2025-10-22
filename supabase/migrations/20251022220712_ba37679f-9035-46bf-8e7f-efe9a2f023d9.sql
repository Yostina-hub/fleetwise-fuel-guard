-- Security & Compliance Tables

-- API Keys for scoped access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  ip_whitelist TEXT[],
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Log for tracking sensitive operations
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  api_key_id UUID REFERENCES public.api_keys(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Data Retention Policies
CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_cleanup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, table_name)
);

-- GDPR Data Requests
CREATE TABLE public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  request_data JSONB,
  response_data JSONB,
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Super admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view API keys in their organization"
  ON public.api_keys FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- RLS Policies for audit_logs (read-only for users)
CREATE POLICY "Super admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- RLS Policies for data_retention_policies
CREATE POLICY "Super admins can manage retention policies"
  ON public.data_retention_policies FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for gdpr_requests
CREATE POLICY "Super admins can manage GDPR requests"
  ON public.gdpr_requests FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view their own GDPR requests"
  ON public.gdpr_requests FOR SELECT
  USING (user_id = auth.uid() OR requested_by = auth.uid());

CREATE POLICY "Users can create GDPR requests"
  ON public.gdpr_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL,
  _status TEXT DEFAULT 'success',
  _error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _audit_id UUID;
BEGIN
  -- Get user's organization
  _org_id := get_user_organization(auth.uid());
  
  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    status,
    error_message
  ) VALUES (
    _org_id,
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    _old_values,
    _new_values,
    _status,
    _error_message
  ) RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$$;