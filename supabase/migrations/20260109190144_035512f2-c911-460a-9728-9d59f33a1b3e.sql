-- Ensure organization settings are writable for authenticated org members.
-- (Upsert requires INSERT permission even when the row already exists.)

DROP POLICY IF EXISTS "Super admins can insert org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Super admins can update org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Super admins can delete org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Super admins can select org settings" ON public.organization_settings;

-- Keep (or recreate) a clear authenticated-only SELECT policy
DROP POLICY IF EXISTS "Users can view their org settings" ON public.organization_settings;

CREATE POLICY "Org members can view org settings"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can insert org settings"
ON public.organization_settings
FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org members can update org settings"
ON public.organization_settings
FOR UPDATE
TO authenticated
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Optional: prevent deletes from client (keep settings stable). If needed later, we can add an admin-only delete policy.
DROP POLICY IF EXISTS "Org members can delete org settings" ON public.organization_settings;