
-- =========================================================
-- 1. Standardize fleet_pools codes to lowercase UI form
-- =========================================================

-- Map known DB codes -> UI codes
UPDATE public.fleet_pools SET code = 'corp_fom1_ho_day'      WHERE lower(code) = 'ho_day'      AND parent_code = 'FOM_I';
UPDATE public.fleet_pools SET code = 'corp_fom1_ho_night'    WHERE lower(code) = 'ho_night'    AND parent_code = 'FOM_I';
UPDATE public.fleet_pools SET code = 'corp_fom1_tpo_eyor'    WHERE lower(code) = 'tpo_eyor'    AND parent_code = 'FOM_I';
UPDATE public.fleet_pools SET code = 'corp_fom1_personal'   WHERE lower(code) = 'personal'    AND parent_code = 'FOM_I';
UPDATE public.fleet_pools SET code = 'corp_fom2_central_tx',  parent_code = 'corp_fom2' WHERE lower(code) = 'central_tx';
UPDATE public.fleet_pools SET code = 'corp_fom2_legehar_fan', parent_code = 'corp_fom2' WHERE lower(code) = 'legehar_fan';
UPDATE public.fleet_pools SET code = 'corp_fom2_wtn',         parent_code = 'corp_fom2' WHERE lower(code) = 'wtn';
UPDATE public.fleet_pools SET code = 'corp_fom2_legehar_om',  parent_code = 'corp_fom2' WHERE lower(code) = 'legehar_om';
UPDATE public.fleet_pools SET parent_code = 'corp_fom1' WHERE parent_code = 'FOM_I';

-- =========================================================
-- 2. Dedupe fleet_pools (organization_id, code) — keep oldest
-- =========================================================
WITH ranked AS (
  SELECT id,
         organization_id,
         code,
         row_number() OVER (PARTITION BY organization_id, lower(code) ORDER BY created_at, id) AS rn
  FROM public.fleet_pools
)
DELETE FROM public.fleet_pools fp
USING ranked r
WHERE fp.id = r.id AND r.rn > 1;

-- Also ensure parent pools exist for hierarchy
INSERT INTO public.fleet_pools (organization_id, category, name, code, sort_order, description)
SELECT DISTINCT o.id, 'corporate', 'FOM I', 'corp_fom1', 10, 'Fleet Operations Management I'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.fleet_pools p WHERE p.organization_id = o.id AND p.code = 'corp_fom1'
);
INSERT INTO public.fleet_pools (organization_id, category, name, code, sort_order, description)
SELECT DISTINCT o.id, 'corporate', 'FOM II', 'corp_fom2', 20, 'Fleet Operations Management II'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.fleet_pools p WHERE p.organization_id = o.id AND p.code = 'corp_fom2'
);

-- =========================================================
-- 3. pool_memberships table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pool_memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  pool_code       text NOT NULL,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('member','manager')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  UNIQUE (organization_id, user_id, pool_code, role)
);

CREATE INDEX IF NOT EXISTS idx_pool_memberships_user
  ON public.pool_memberships (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_pool_memberships_pool
  ON public.pool_memberships (organization_id, pool_code);

ALTER TABLE public.pool_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships in their org
CREATE POLICY "pool_memberships_select_org"
  ON public.pool_memberships FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Only org admins / super admins / operations managers manage memberships
CREATE POLICY "pool_memberships_admin_write"
  ON public.pool_memberships FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'org_admin')
    OR public.has_role(auth.uid(), 'operations_manager')
    OR public.has_role(auth.uid(), 'fleet_owner')
    OR public.has_role(auth.uid(), 'fleet_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'org_admin')
    OR public.has_role(auth.uid(), 'operations_manager')
    OR public.has_role(auth.uid(), 'fleet_owner')
    OR public.has_role(auth.uid(), 'fleet_manager')
  );

-- =========================================================
-- 4. Helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_pool_codes(_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pool_code FROM public.pool_memberships WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_managed_pool_codes(_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pool_code FROM public.pool_memberships WHERE user_id = _user_id AND role = 'manager';
$$;

CREATE OR REPLACE FUNCTION public.is_pool_manager(_user_id uuid, _pool_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pool_memberships
    WHERE user_id = _user_id AND pool_code = _pool_code AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_pool(_user_id uuid, _pool_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pool_memberships
    WHERE user_id = _user_id AND pool_code = _pool_code
  );
$$;

-- =========================================================
-- 5. Backfill drivers.assigned_pool from their primary vehicle
-- =========================================================
UPDATE public.drivers d
SET assigned_pool = v.specific_pool
FROM public.vehicles v
WHERE d.assigned_pool IS NULL
  AND v.assigned_driver_id = d.id
  AND v.specific_pool IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_assigned_pool
  ON public.drivers (organization_id, assigned_pool) WHERE assigned_pool IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_specific_pool
  ON public.vehicles (organization_id, specific_pool) WHERE specific_pool IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_pool_name
  ON public.vehicle_requests (organization_id, pool_name) WHERE pool_name IS NOT NULL;
