DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_approvals;
  END IF;
END $$;