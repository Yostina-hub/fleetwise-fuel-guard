-- Create dedicated bucket for trip incident attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for this bucket
-- Folder structure: {organization_id}/{incident_id_or_temp}/{filename}

CREATE POLICY "Org members can view incident attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Org members can upload incident attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Org members can update their incident attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Org members can delete their incident attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add columns to incidents to store reason category and attachments (separate from existing incident_type which is a system enum)
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS trip_id uuid,
  ADD COLUMN IF NOT EXISTS reported_via text;