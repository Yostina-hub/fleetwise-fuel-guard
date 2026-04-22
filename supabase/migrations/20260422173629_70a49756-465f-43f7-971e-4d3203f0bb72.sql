ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS cargo_weight_kg numeric;

COMMENT ON COLUMN public.vehicle_requests.cargo_weight_kg IS
  'Total cargo weight in kilograms requested by the user (validated client + server side against vehicle max payload).';