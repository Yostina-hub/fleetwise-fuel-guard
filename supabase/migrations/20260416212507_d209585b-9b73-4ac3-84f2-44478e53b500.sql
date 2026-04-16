ALTER TABLE public.fuel_requests
  ADD COLUMN IF NOT EXISTS technician_name text,
  ADD COLUMN IF NOT EXISTS technician_employee_id text,
  ADD COLUMN IF NOT EXISTS security_name text,
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS running_hours numeric;