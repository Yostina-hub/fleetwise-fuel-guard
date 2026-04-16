
-- Role-location access: maps roles to specific depots/business units
CREATE TABLE public.role_location_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'depot',
  location_id UUID NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, role, location_type, location_id, access_level)
);

ALTER TABLE public.role_location_access ENABLE ROW LEVEL SECURITY;

-- Super admins and org admins can manage location access
CREATE POLICY "Super admins manage location access"
  ON public.role_location_access FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin') AND organization_id = public.get_user_organization(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin') AND organization_id = public.get_user_organization(auth.uid())));

-- All authenticated users can read location access rules (needed for filtering)
CREATE POLICY "Authenticated users read location access"
  ON public.role_location_access FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_role_location_access_updated_at
  BEFORE UPDATE ON public.role_location_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
