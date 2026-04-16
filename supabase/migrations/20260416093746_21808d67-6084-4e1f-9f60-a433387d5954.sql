
-- Create employee_type enum
CREATE TYPE public.employee_type AS ENUM (
  'driver', 'mechanic', 'dispatcher', 'office_staff', 'manager', 'technician', 'coordinator', 'other'
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employee_id TEXT,
  employee_type public.employee_type NOT NULL DEFAULT 'other',
  department TEXT,
  job_title TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  user_id UUID,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_employees_org ON public.employees(organization_id);
CREATE INDEX idx_employees_type ON public.employees(employee_type);
CREATE INDEX idx_employees_driver ON public.employees(driver_id);
CREATE INDEX idx_employees_status ON public.employees(status);

-- RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Auto-populate employees from existing drivers
INSERT INTO public.employees (organization_id, first_name, last_name, email, phone, employee_id, employee_type, hire_date, status, avatar_url, driver_id, notes, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, created_at, updated_at)
SELECT 
  d.organization_id, d.first_name, d.last_name, d.email, d.phone, d.employee_id,
  'driver'::public.employee_type, d.hire_date::date, d.status, d.avatar_url, d.id,
  d.notes, d.emergency_contact_name, d.emergency_contact_phone, d.emergency_contact_relationship,
  d.created_at, d.updated_at
FROM public.drivers d;

-- Add employee_id to HR tables
ALTER TABLE public.driver_attendance ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_payroll ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_contracts ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_leave_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_cost_allocations ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_performance_kpis ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.driver_performance_reviews ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;

-- Backfill employee_id in HR tables from driver_id
UPDATE public.driver_attendance da SET employee_id = e.id FROM public.employees e WHERE e.driver_id = da.driver_id AND da.employee_id IS NULL;
UPDATE public.driver_payroll dp SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dp.driver_id AND dp.employee_id IS NULL;
UPDATE public.driver_contracts dc SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dc.driver_id AND dc.employee_id IS NULL;
UPDATE public.driver_leave_requests dl SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dl.driver_id AND dl.employee_id IS NULL;
UPDATE public.driver_cost_allocations dca SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dca.driver_id AND dca.employee_id IS NULL;
UPDATE public.driver_performance_kpis dk SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dk.driver_id AND dk.employee_id IS NULL;
UPDATE public.driver_performance_reviews dr SET employee_id = e.id FROM public.employees e WHERE e.driver_id = dr.driver_id AND dr.employee_id IS NULL;

-- Updated_at trigger
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Rate limit trigger
CREATE TRIGGER rate_limit_employees_inserts BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION check_insert_rate_limit();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
