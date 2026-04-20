-- 1. Add 'user' to the app_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'user'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END$$;

-- 2. Custom roles table (admin-defined roles alongside built-in enum roles)
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  label           text NOT NULL,
  description     text,
  is_system       boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_roles_name_format CHECK (name ~ '^[a-z][a-z0-9_]{1,49}$'),
  CONSTRAINT custom_roles_label_len   CHECK (char_length(label) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_roles_org_name_uniq
  ON public.custom_roles (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

CREATE INDEX IF NOT EXISTS custom_roles_org_idx ON public.custom_roles(organization_id);

-- 3. Custom role permissions
CREATE TABLE IF NOT EXISTS public.custom_role_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id  uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_id   uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custom_role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS custom_role_permissions_role_idx
  ON public.custom_role_permissions(custom_role_id);

-- 4. updated_at trigger
DROP TRIGGER IF EXISTS trg_custom_roles_updated_at ON public.custom_roles;
CREATE TRIGGER trg_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.custom_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — custom_roles
DROP POLICY IF EXISTS "View custom roles in org"          ON public.custom_roles;
DROP POLICY IF EXISTS "Manage custom roles (super/org)"   ON public.custom_roles;

CREATE POLICY "View custom roles in org"
  ON public.custom_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Manage custom roles (super/org)"
  ON public.custom_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'org_admin'::public.app_role)
      AND organization_id IN (
        SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'org_admin'::public.app_role)
      AND organization_id IN (
        SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- 7. RLS policies — custom_role_permissions
DROP POLICY IF EXISTS "View custom role permissions"      ON public.custom_role_permissions;
DROP POLICY IF EXISTS "Manage custom role permissions"    ON public.custom_role_permissions;

CREATE POLICY "View custom role permissions"
  ON public.custom_role_permissions FOR SELECT TO authenticated
  USING (
    custom_role_id IN (SELECT id FROM public.custom_roles)
  );

CREATE POLICY "Manage custom role permissions"
  ON public.custom_role_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_roles cr
      WHERE cr.id = custom_role_id
        AND (
          public.has_role(auth.uid(), 'super_admin'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'org_admin'::public.app_role)
            AND cr.organization_id IN (
              SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_roles cr
      WHERE cr.id = custom_role_id
        AND (
          public.has_role(auth.uid(), 'super_admin'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'org_admin'::public.app_role)
            AND cr.organization_id IN (
              SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
            )
          )
        )
    )
  );