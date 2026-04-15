
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_requests;
  END IF;
END $$;
