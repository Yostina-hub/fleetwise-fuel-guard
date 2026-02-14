
-- Organizations table - add suspension fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- Impersonation audit logs
CREATE TABLE IF NOT EXISTS public.impersonation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  impersonated_user_id uuid NOT NULL,
  action text NOT NULL,
  organization_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.impersonation_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view impersonation logs"
  ON public.impersonation_audit_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert impersonation logs"
  ON public.impersonation_audit_logs FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Impersonation activity logs
CREATE TABLE IF NOT EXISTS public.impersonation_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonation_session_id text NOT NULL,
  super_admin_id uuid NOT NULL,
  impersonated_user_id uuid NOT NULL,
  organization_id uuid,
  activity_type text NOT NULL,
  resource_type text,
  resource_id text,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.impersonation_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view activity logs"
  ON public.impersonation_activity_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert activity logs"
  ON public.impersonation_activity_logs FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_type text,
  browser text,
  os text,
  ip_address text,
  is_active boolean DEFAULT true,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);
