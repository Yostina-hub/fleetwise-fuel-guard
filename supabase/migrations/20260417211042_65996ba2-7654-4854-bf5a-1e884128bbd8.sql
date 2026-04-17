-- 1. Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view departments"
ON public.departments FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can insert departments"
ON public.departments FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can update departments"
ON public.departments FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Org members can delete departments"
ON public.departments FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Extend tire_requests with iPROC-aligned fields
ALTER TABLE public.tire_requests
  ADD COLUMN IF NOT EXISTS assigned_department_id UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS requestor_department_id UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS request_by_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS request_by_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS km_reading NUMERIC,
  ADD COLUMN IF NOT EXISTS driver_type TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT,
  ADD COLUMN IF NOT EXISTS fuel_level_in_tank TEXT,
  ADD COLUMN IF NOT EXISTS additional_description TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_preference TEXT,
  ADD COLUMN IF NOT EXISTS notify_user BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Storage bucket for tire request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('tire-request-attachments', 'tire-request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies for the bucket (org-scoped via folder = organization_id)
CREATE POLICY "Org members read tire request attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tire-request-attachments'
  AND (storage.foldername(name))[1] = public.get_user_organization(auth.uid())::text
);

CREATE POLICY "Org members upload tire request attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tire-request-attachments'
  AND (storage.foldername(name))[1] = public.get_user_organization(auth.uid())::text
);

CREATE POLICY "Org members delete tire request attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tire-request-attachments'
  AND (storage.foldername(name))[1] = public.get_user_organization(auth.uid())::text
);