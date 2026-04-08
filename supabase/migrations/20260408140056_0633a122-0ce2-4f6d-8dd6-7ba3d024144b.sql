-- CRITICAL FIX: Prevent users from changing their own organization_id
-- This closes a privilege escalation where any user could set their org to another org's UUID

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));