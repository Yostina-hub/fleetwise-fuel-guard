
ALTER TABLE public.fleet_assets
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fleet_assets_vehicle_id ON public.fleet_assets(vehicle_id);
