
-- =============================================
-- DRIVERS: Add new columns for comprehensive registration
-- =============================================
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_type TEXT DEFAULT 'ethio_contract';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address_region TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address_zone TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address_woreda TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address_specific TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS govt_id_type TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_issue_date DATE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_type TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_front_url TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_back_url TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS national_id_url TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS route_type TEXT DEFAULT 'intracity';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS blood_type TEXT;

-- =============================================
-- VEHICLES: Add new columns for comprehensive registration
-- =============================================
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_group TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS route_type TEXT DEFAULT 'intracity';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS drive_type TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_category TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registration_cert_no TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_policy_no TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS commercial_permit BOOLEAN DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS permit_expiry DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS capacity_volume NUMERIC;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS temperature_control TEXT DEFAULT 'none';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS gps_installed BOOLEAN DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS gps_device_id TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS owner_certificate_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_cert_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS tax_clearance_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_front_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_back_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_left_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_right_url TEXT;

-- =============================================
-- VEHICLE_OWNERS: New table
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicle_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL DEFAULT 'individual',
  full_name TEXT,
  department TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  zone TEXT,
  woreda TEXT,
  govt_id_business_reg TEXT,
  tax_id_vat TEXT,
  bank_name TEXT,
  bank_account TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  status TEXT DEFAULT 'active',
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicle owners in their org"
  ON public.vehicle_owners FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can create vehicle owners in their org"
  ON public.vehicle_owners FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update vehicle owners in their org"
  ON public.vehicle_owners FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can delete vehicle owners in their org"
  ON public.vehicle_owners FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid()));

-- Add FK from vehicles to vehicle_owners
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_owner_id_fkey') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.vehicle_owners(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Updated_at trigger for vehicle_owners
CREATE TRIGGER update_vehicle_owners_updated_at
  BEFORE UPDATE ON public.vehicle_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('driver-documents', 'driver-documents', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('vehicle-attachments', 'vehicle-attachments', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for driver-documents
CREATE POLICY "Authenticated users can upload driver documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents');

CREATE POLICY "Authenticated users can view driver documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents');

CREATE POLICY "Authenticated users can update driver documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-documents');

CREATE POLICY "Authenticated users can delete driver documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents');

-- Storage RLS for vehicle-attachments
CREATE POLICY "Authenticated users can upload vehicle attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-attachments');

CREATE POLICY "Authenticated users can view vehicle attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-attachments');

CREATE POLICY "Authenticated users can update vehicle attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-attachments');

CREATE POLICY "Authenticated users can delete vehicle attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-attachments');
