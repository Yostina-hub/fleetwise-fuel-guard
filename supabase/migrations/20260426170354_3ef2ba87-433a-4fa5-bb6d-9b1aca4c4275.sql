-- Add night request subcategory classification
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS night_request_subcategory text
  CHECK (night_request_subcategory IS NULL OR night_request_subcategory IN ('night_shift', 'emergency'));

COMMENT ON COLUMN public.vehicle_requests.night_request_subcategory IS
  'Subcategory for Night Requests: night_shift (planned shift work) or emergency (urgent night incident).';