ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS request_start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS notify_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_preference text,
  ADD COLUMN IF NOT EXISTS context_value text DEFAULT 'Vehicle Maintenance request',
  ADD COLUMN IF NOT EXISTS asset_criticality text,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS additional_description text,
  ADD COLUMN IF NOT EXISTS remark text,
  ADD COLUMN IF NOT EXISTS request_by_completion_date timestamp with time zone;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-attachments', 'maintenance-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Org members can read maintenance attachments" ON storage.objects;
CREATE POLICY "Org members can read maintenance attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'maintenance-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can upload maintenance attachments" ON storage.objects;
CREATE POLICY "Org members can upload maintenance attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can delete own maintenance attachments" ON storage.objects;
CREATE POLICY "Org members can delete own maintenance attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-attachments'
    AND owner = auth.uid()
  );