-- Enable realtime for drivers and ensure full row payloads for both drivers and vehicles
-- so that newly-registered records appear in the UI without a manual refresh.

-- Make sure the entire row (old + new) is shipped on UPDATE/DELETE so client-side
-- filters (organization_id=eq.X) can match correctly.
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;

-- Add drivers to the realtime publication. vehicles is already a member.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'drivers'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers';
  END IF;
END $$;