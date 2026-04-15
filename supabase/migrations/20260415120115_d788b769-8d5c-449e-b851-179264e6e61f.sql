-- Drop existing policies
DROP POLICY IF EXISTS "Users can view workflows in their org" ON public.workflows;
DROP POLICY IF EXISTS "Users can create workflows in their org" ON public.workflows;
DROP POLICY IF EXISTS "Users can update workflows in their org" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their org" ON public.workflows;

-- Recreate with super_admin bypass
CREATE POLICY "Users can view workflows in their org"
ON public.workflows FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can create workflows in their org"
ON public.workflows FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can update workflows in their org"
ON public.workflows FOR UPDATE TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can delete workflows in their org"
ON public.workflows FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  OR is_super_admin(auth.uid())
);