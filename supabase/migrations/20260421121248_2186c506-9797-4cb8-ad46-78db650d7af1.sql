ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_name text;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_department_id ON public.vehicle_requests(department_id);