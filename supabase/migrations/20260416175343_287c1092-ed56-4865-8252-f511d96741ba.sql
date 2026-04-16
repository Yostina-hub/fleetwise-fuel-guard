
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' 
      AND policyname='Authenticated users can upload vehicle attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload vehicle attachments"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'vehicle-attachments');
  END IF;
END $$;
