-- Add assigned_location column to vehicles to track Corporate / Zone / Region assignment
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_location text;
COMMENT ON COLUMN public.vehicles.assigned_location IS 'Vehicle assigned location group/region (e.g. corp_fom1, region_bole) — mirrors driver department';
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_location ON public.vehicles (organization_id, assigned_location);