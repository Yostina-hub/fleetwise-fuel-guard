-- Add dedicated audit columns to vehicle_requests so "filed on behalf of"
-- is tracked structurally instead of only as a free-text note in `purpose`.
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS filed_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS filed_by_name text NULL,
  ADD COLUMN IF NOT EXISTS filed_on_behalf boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_filed_by
  ON public.vehicle_requests (filed_by_user_id)
  WHERE filed_by_user_id IS NOT NULL;

COMMENT ON COLUMN public.vehicle_requests.filed_by_user_id IS
  'The actual signed-in user who submitted the request (audit trail). When NULL, requester_id == filer.';
COMMENT ON COLUMN public.vehicle_requests.filed_by_name IS
  'Snapshot of the filer''s display name at the time of submission.';
COMMENT ON COLUMN public.vehicle_requests.filed_on_behalf IS
  'TRUE when the request was filed by someone other than the requester.';