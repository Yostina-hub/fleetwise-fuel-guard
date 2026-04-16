
-- Add photo support to maintenance_requests
ALTER TABLE public.maintenance_requests 
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}'::text[];

-- Add check-in/out mileage tracking to dispatch_jobs
ALTER TABLE public.dispatch_jobs 
  ADD COLUMN IF NOT EXISTS odometer_start numeric,
  ADD COLUMN IF NOT EXISTS odometer_end numeric,
  ADD COLUMN IF NOT EXISTS distance_traveled_km numeric;

-- Enable realtime for driver portal tables
ALTER TABLE public.maintenance_requests REPLICA IDENTITY FULL;
ALTER TABLE public.fuel_requests REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_requests REPLICA IDENTITY FULL;
ALTER TABLE public.dispatch_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_jobs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
