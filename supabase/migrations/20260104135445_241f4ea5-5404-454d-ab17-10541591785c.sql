-- Enable realtime stream for vehicle telemetry
ALTER TABLE public.vehicle_telemetry REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add table to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vehicle_telemetry'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_telemetry;
  END IF;
END $$;
