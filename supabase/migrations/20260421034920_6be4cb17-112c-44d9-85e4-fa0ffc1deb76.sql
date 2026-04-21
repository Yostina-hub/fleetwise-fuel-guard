-- Resource-aware vehicle request fields. These power the demand-shaping
-- recommendation engine and give approvers the context they need to suggest
-- a smaller / cheaper vehicle class when a requester over-specs.
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS purpose_category text NULL,
  ADD COLUMN IF NOT EXISTS cargo_load text NULL,
  ADD COLUMN IF NOT EXISTS recommended_vehicle_type text NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type_justification text NULL;

COMMENT ON COLUMN public.vehicle_requests.purpose_category IS
  'Business purpose taxonomy (client_visit, site_inspection, training, logistics, etc). Personal use is not allowed.';
COMMENT ON COLUMN public.vehicle_requests.cargo_load IS
  'Cargo size requirement: none / small / medium / large. Drives the vehicle-class recommendation.';
COMMENT ON COLUMN public.vehicle_requests.recommended_vehicle_type IS
  'Smallest sufficient vehicle class the system recommended at submission time.';
COMMENT ON COLUMN public.vehicle_requests.vehicle_type_justification IS
  'Required when the requester picks a larger class than recommended. Shown to the approver as audit context.';