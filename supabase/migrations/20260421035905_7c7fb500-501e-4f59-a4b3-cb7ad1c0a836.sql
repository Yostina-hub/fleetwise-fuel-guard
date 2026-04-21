-- Add scope classification to depots so vehicles can be filtered by org tier
ALTER TABLE public.depots
ADD COLUMN IF NOT EXISTS depot_type text NOT NULL DEFAULT 'corporate'
CHECK (depot_type IN ('corporate', 'zonal', 'regional'));

CREATE INDEX IF NOT EXISTS idx_depots_depot_type ON public.depots(depot_type);