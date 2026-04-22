-- 1) Allow org_admin to manage the role->permission matrix (but NOT for super_admin)
DROP POLICY IF EXISTS "Org admins can manage non-superadmin role permissions" ON public.role_permissions;
CREATE POLICY "Org admins can manage non-superadmin role permissions"
ON public.role_permissions
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND role <> 'super_admin'::app_role
);

-- 2) Allow org_admin to manage user_roles within their organization
--    (super_admin policy already exists). org_admin cannot grant super_admin.
DROP POLICY IF EXISTS "Org admins manage roles in their org" ON public.user_roles;
CREATE POLICY "Org admins manage roles in their org"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND organization_id = (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND organization_id = (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- 3) Per-user permission overrides table
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  effect text NOT NULL CHECK (effect IN ('granted', 'revoked')),
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_upo_user ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_upo_org ON public.user_permission_overrides(organization_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Users can see their own overrides
DROP POLICY IF EXISTS "Users view own overrides" ON public.user_permission_overrides;
CREATE POLICY "Users view own overrides"
ON public.user_permission_overrides
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Super admins fully manage
DROP POLICY IF EXISTS "Super admins manage overrides" ON public.user_permission_overrides;
CREATE POLICY "Super admins manage overrides"
ON public.user_permission_overrides
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Org admins manage overrides for users in their org
DROP POLICY IF EXISTS "Org admins manage overrides in their org" ON public.user_permission_overrides;
CREATE POLICY "Org admins manage overrides in their org"
ON public.user_permission_overrides
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'org_admin'::app_role)
  AND organization_id = (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_upo_updated_at ON public.user_permission_overrides;
CREATE TRIGGER trg_upo_updated_at
BEFORE UPDATE ON public.user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Update has_permission to honor overrides
--    Logic: explicit 'revoked' override always wins; explicit 'granted' override
--    short-circuits true; otherwise fall back to role-based mapping.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _perm_id uuid;
  _override text;
BEGIN
  SELECT id INTO _perm_id FROM public.permissions WHERE name = _permission_name;
  IF _perm_id IS NULL THEN
    RETURN false;
  END IF;

  -- Per-user override takes precedence
  SELECT effect INTO _override
  FROM public.user_permission_overrides
  WHERE user_id = _user_id AND permission_id = _perm_id
  LIMIT 1;

  IF _override = 'revoked' THEN
    RETURN false;
  ELSIF _override = 'granted' THEN
    RETURN true;
  END IF;

  -- Fall back to role-based matrix
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_id = _perm_id
  );
END;
$$;

-- 5) Helper to fetch effective permissions for a user (used by frontend)
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid)
RETURNS TABLE (permission_name text, source text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH role_perms AS (
    SELECT DISTINCT p.name AS permission_name, 'role'::text AS source
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
  ),
  granted AS (
    SELECT p.name AS permission_name, 'override_grant'::text AS source
    FROM public.user_permission_overrides upo
    JOIN public.permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = _user_id AND upo.effect = 'granted'
  ),
  revoked AS (
    SELECT p.name AS permission_name
    FROM public.user_permission_overrides upo
    JOIN public.permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = _user_id AND upo.effect = 'revoked'
  )
  SELECT permission_name, source FROM (
    SELECT * FROM role_perms
    UNION
    SELECT * FROM granted
  ) merged
  WHERE permission_name NOT IN (SELECT permission_name FROM revoked);
$$;
