-- ============================================================
-- Generator eAM (enterprise Asset Management) extension
-- ============================================================

-- 1. Add eAM columns to generators table
ALTER TABLE public.generators
  ADD COLUMN IF NOT EXISTS asset_number text,
  ADD COLUMN IF NOT EXISTS asset_group text,
  ADD COLUMN IF NOT EXISTS asset_serial_number text,
  ADD COLUMN IF NOT EXISTS asset_category text,
  ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'Capital',
  ADD COLUMN IF NOT EXISTS parent_asset_id uuid REFERENCES public.generators(id) ON DELETE SET NULL,
  -- Main tab
  ADD COLUMN IF NOT EXISTS owning_department text,
  ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS wip_accounting_class text,
  ADD COLUMN IF NOT EXISTS asset_status text NOT NULL DEFAULT 'CREATED',
  ADD COLUMN IF NOT EXISTS is_maintainable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_gis_asset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operation_log_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_expiration date,
  ADD COLUMN IF NOT EXISTS checked_out boolean NOT NULL DEFAULT false,
  -- Location tab
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  -- Safety tab
  ADD COLUMN IF NOT EXISTS hazard_class text,
  ADD COLUMN IF NOT EXISTS safety_notes text,
  ADD COLUMN IF NOT EXISTS lockout_tagout_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_required text[],
  ADD COLUMN IF NOT EXISTS inspection_frequency_days integer,
  -- Others tab
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS manufacture_date date,
  ADD COLUMN IF NOT EXISTS commission_date date,
  ADD COLUMN IF NOT EXISTS purchase_cost numeric,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS custom_attributes jsonb DEFAULT '{}'::jsonb;

-- 2. Validation constraints (use triggers, not CHECKs that we may need to relax)
DO $$
BEGIN
  -- Asset type enumeration via trigger-friendly check
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generators_asset_type_check') THEN
    ALTER TABLE public.generators
      ADD CONSTRAINT generators_asset_type_check
      CHECK (asset_type IN ('Capital','Expense','Group'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generators_criticality_check') THEN
    ALTER TABLE public.generators
      ADD CONSTRAINT generators_criticality_check
      CHECK (criticality IN ('low','medium','high','critical'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generators_asset_status_check') THEN
    ALTER TABLE public.generators
      ADD CONSTRAINT generators_asset_status_check
      CHECK (asset_status IN ('CREATED','ACTIVE','IN_SERVICE','OUT_OF_SERVICE','RETIRED','UNDER_MAINTENANCE'));
  END IF;
END $$;

-- 3. Unique asset number per organization
CREATE UNIQUE INDEX IF NOT EXISTS generators_org_asset_number_unique
  ON public.generators(organization_id, asset_number)
  WHERE asset_number IS NOT NULL;

-- 4. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_generators_asset_status ON public.generators(asset_status);
CREATE INDEX IF NOT EXISTS idx_generators_criticality ON public.generators(criticality);
CREATE INDEX IF NOT EXISTS idx_generators_parent ON public.generators(parent_asset_id) WHERE parent_asset_id IS NOT NULL;

-- 5. Auto-generate asset_number per org if not provided
CREATE OR REPLACE FUNCTION public.generate_generator_asset_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_num int;
BEGIN
  IF NEW.asset_number IS NULL OR length(trim(NEW.asset_number)) = 0 THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(asset_number, '\D', '', 'g'), '')::int), 0) + 1
      INTO v_next_num
      FROM public.generators
     WHERE organization_id = NEW.organization_id
       AND asset_number ~ '^GEN-\d+$';
    NEW.asset_number := 'GEN-' || lpad(v_next_num::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_generator_asset_number ON public.generators;
CREATE TRIGGER trg_generate_generator_asset_number
  BEFORE INSERT ON public.generators
  FOR EACH ROW EXECUTE FUNCTION public.generate_generator_asset_number();