
-- =====================================================
-- SECURITY FIX: Credential Exposure & Permissive Policies
-- =====================================================

-- 1. SMTP Configurations: Restrict to super_admin/org_admin only
DROP POLICY IF EXISTS "Users can view SMTP configs in their organization" ON public.smtp_configurations;
DROP POLICY IF EXISTS "Users can create SMTP configs in their organization" ON public.smtp_configurations;
DROP POLICY IF EXISTS "Users can update SMTP configs in their organization" ON public.smtp_configurations;
DROP POLICY IF EXISTS "Users can delete SMTP configs in their organization" ON public.smtp_configurations;

CREATE POLICY "Admins can view SMTP configs"
ON public.smtp_configurations FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
);

CREATE POLICY "Admins can insert SMTP configs"
ON public.smtp_configurations FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
);

CREATE POLICY "Admins can update SMTP configs"
ON public.smtp_configurations FOR UPDATE TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
);

CREATE POLICY "Admins can delete SMTP configs"
ON public.smtp_configurations FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
);

-- 2. SMS Gateway Config: Restrict to super_admin/org_admin only
DROP POLICY IF EXISTS "Users can view SMS config for their organization" ON public.sms_gateway_config;
DROP POLICY IF EXISTS "Admins can manage SMS config" ON public.sms_gateway_config;

CREATE POLICY "Admins can manage SMS config"
ON public.sms_gateway_config FOR ALL TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
)
WITH CHECK (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role))
);

-- 3. API Keys: Remove SELECT for all users, restrict to super_admin only
DROP POLICY IF EXISTS "Users can view API keys in their organization" ON public.api_keys;

CREATE POLICY "Super admins can view API keys"
ON public.api_keys FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- 4. Devices: Restrict SELECT to operational roles only (hides auth_token from drivers/technicians)
DROP POLICY IF EXISTS "Users can view devices in their organization" ON public.devices;

CREATE POLICY "Operational roles can view devices"
ON public.devices FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'org_admin'::app_role)
    OR has_role(auth.uid(), 'fleet_manager'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  )
);

-- 5. Webhook deliveries: Restrict INSERT/UPDATE to service_role only
DROP POLICY IF EXISTS "System can insert webhook deliveries" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "System can update webhook deliveries" ON public.webhook_deliveries;

CREATE POLICY "Service role can insert webhook deliveries"
ON public.webhook_deliveries FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update webhook deliveries"
ON public.webhook_deliveries FOR UPDATE TO service_role
USING (true);

-- 6. Rate limit tables: Restrict to service_role only
DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;
DROP POLICY IF EXISTS "Service role access for rate limits" ON public.device_rate_limits;

CREATE POLICY "Service role manages API rate limits"
ON public.api_rate_limits FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role manages device rate limits"
ON public.device_rate_limits FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 7. Login history: Restrict INSERT to service_role
DROP POLICY IF EXISTS "System can insert login history" ON public.login_history;

CREATE POLICY "Service role can insert login history"
ON public.login_history FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view login history"
ON public.login_history FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- 8. Security audit logs: Restrict INSERT to service_role
DROP POLICY IF EXISTS "audit_insert" ON public.security_audit_logs;

CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_logs FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_logs FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- 9. Vehicle geofence states: Restrict to service_role writes + authenticated reads via vehicle org
DROP POLICY IF EXISTS "Service role can manage vehicle geofence states" ON public.vehicle_geofence_states;

CREATE POLICY "Service role manages geofence states"
ON public.vehicle_geofence_states FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Org members can view geofence states"
ON public.vehicle_geofence_states FOR SELECT TO authenticated
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE organization_id = get_user_organization(auth.uid())
  )
);

-- 10. Add policies to tables with RLS but no policies
-- rate_limit_logs (no org_id, system-only table)
CREATE POLICY "Service role manages rate limit logs"
ON public.rate_limit_logs FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- rate_limit_violations (has user_id column)
CREATE POLICY "Service role manages rate limit violations"
ON public.rate_limit_violations FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Super admins can view rate limit violations"
ON public.rate_limit_violations FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);
