DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_assignments;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicle_request_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_request_approvals;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicle_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_requests;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_jobs;
  END IF;
END $$;