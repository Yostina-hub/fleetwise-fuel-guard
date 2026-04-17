-- Add Oracle EBS-style fields for inspection work requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS requestor_pool text,
  ADD COLUMN IF NOT EXISTS requestor_employee_id text,
  ADD COLUMN IF NOT EXISTS driver_type text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS request_subtype text;

COMMENT ON COLUMN public.maintenance_requests.requestor_pool IS 'Fleet pool the requestor belongs to (Oracle EBS Requestor Pool)';
COMMENT ON COLUMN public.maintenance_requests.requestor_employee_id IS 'Employee ID of the requesting employee';
COMMENT ON COLUMN public.maintenance_requests.driver_type IS 'staff | outsourced | contract';
COMMENT ON COLUMN public.maintenance_requests.driver_phone IS 'Phone number of the assigned driver at time of request';
COMMENT ON COLUMN public.maintenance_requests.request_subtype IS 'For inspection requests: pre_trip | post_trip | annual';