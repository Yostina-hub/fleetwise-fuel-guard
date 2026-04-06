-- Fix 1: driver_behavior_scores - remove overly permissive policies
DROP POLICY IF EXISTS "Users can view their organization's driver scores" ON public.driver_behavior_scores;

DROP POLICY IF EXISTS "System can insert driver scores" ON public.driver_behavior_scores;
CREATE POLICY "System can insert driver scores" ON public.driver_behavior_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization(auth.uid())
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "System can update driver scores" ON public.driver_behavior_scores;
CREATE POLICY "System can update driver scores" ON public.driver_behavior_scores
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Fix 2: email_report_configs - remove overly permissive SELECT
DROP POLICY IF EXISTS "Users can view their organization's report configs" ON public.email_report_configs;

-- Fix 3: organization_settings - remove overly permissive org member SELECT (keep admin-only one)
DROP POLICY IF EXISTS "Org members can view org settings" ON public.organization_settings;

-- Also restrict INSERT and UPDATE to admin roles only
DROP POLICY IF EXISTS "Org members can insert org settings" ON public.organization_settings;
CREATE POLICY "Admins can insert organization settings" ON public.organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) 
     AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role)))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Org members can update org settings" ON public.organization_settings;
CREATE POLICY "Admins can update organization settings" ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) 
     AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role)))
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) 
     AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'org_admin'::app_role)))
    OR is_super_admin(auth.uid())
  );

-- Fix 4: device_terminal_settings - restrict SELECT to admin/operator roles
DROP POLICY IF EXISTS "Users can view their organization's device settings" ON public.device_terminal_settings;
CREATE POLICY "Admins can view device settings" ON public.device_terminal_settings
  FOR SELECT TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid())
     AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_manager'::app_role)
       OR has_role(auth.uid(), 'operator'::app_role)))
    OR is_super_admin(auth.uid())
  );

-- Also restrict DELETE/UPDATE/INSERT to same roles
DROP POLICY IF EXISTS "Users can update their organization's device settings" ON public.device_terminal_settings;
CREATE POLICY "Admins can update device settings" ON public.device_terminal_settings
  FOR UPDATE TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid())
     AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_manager'::app_role)
       OR has_role(auth.uid(), 'operator'::app_role)))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their organization's device settings" ON public.device_terminal_settings;
CREATE POLICY "Admins can delete device settings" ON public.device_terminal_settings
  FOR DELETE TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid())
     AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert device settings for their organization" ON public.device_terminal_settings;
CREATE POLICY "Admins can insert device settings" ON public.device_terminal_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid())
     AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_manager'::app_role)
       OR has_role(auth.uid(), 'operator'::app_role)))
    OR is_super_admin(auth.uid())
  );