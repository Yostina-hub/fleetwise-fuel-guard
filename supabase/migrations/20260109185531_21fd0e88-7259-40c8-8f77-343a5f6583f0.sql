-- Drop existing policy that's causing the issue
DROP POLICY IF EXISTS "Super admins can manage org settings" ON public.organization_settings;

-- Create separate policies for each operation with proper WITH CHECK
CREATE POLICY "Super admins can select org settings" 
ON public.organization_settings 
FOR SELECT 
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can insert org settings" 
ON public.organization_settings 
FOR INSERT 
WITH CHECK (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can update org settings" 
ON public.organization_settings 
FOR UPDATE 
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super admins can delete org settings" 
ON public.organization_settings 
FOR DELETE 
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);