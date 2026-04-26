ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS requested_request_type text,
  ADD COLUMN IF NOT EXISTS system_classified_type text;

COMMENT ON COLUMN public.vehicle_requests.requested_request_type IS
  'The request_type the requester explicitly chose on the form, before any auto-classification.';

COMMENT ON COLUMN public.vehicle_requests.system_classified_type IS
  'The trip type the system inferred from the start/end times (daily_operation or nighttime_operation).';