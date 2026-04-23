ALTER TABLE public.fleet_pools
  ADD COLUMN IF NOT EXISTS parent_code text,
  ADD COLUMN IF NOT EXISTS shift text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS description text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fleet_pools_shift_check' AND table_name = 'fleet_pools'
  ) THEN
    ALTER TABLE public.fleet_pools
      ADD CONSTRAINT fleet_pools_shift_check CHECK (shift IN ('day','night','all'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_fleet_pools_parent_code
  ON public.fleet_pools(organization_id, parent_code);

COMMENT ON COLUMN public.fleet_pools.parent_code IS
  'Code of the parent group (e.g. FOM_I, FOM_II) for hierarchical corporate pools.';
COMMENT ON COLUMN public.fleet_pools.shift IS
  'Operational shift this pool serves: day, night, or all.';