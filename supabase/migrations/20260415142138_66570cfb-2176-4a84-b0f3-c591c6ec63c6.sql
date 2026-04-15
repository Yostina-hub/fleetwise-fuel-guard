
ALTER TABLE public.trip_requests
  ADD COLUMN IF NOT EXISTS cargo_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS cargo_volume_m3 numeric,
  ADD COLUMN IF NOT EXISTS cargo_description text,
  ADD COLUMN IF NOT EXISTS required_class text,
  ADD COLUMN IF NOT EXISTS notes text;
