CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'geofence-autoclose-every-minute') THEN
    PERFORM cron.unschedule('geofence-autoclose-every-minute');
  END IF;
END $$;

SELECT cron.schedule(
  'geofence-autoclose-every-minute',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/check-geofence-autoclose',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWp3bXlxYWtwcnFkaHJsc296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTc5NDIsImV4cCI6MjA3NjczMzk0Mn0.hcyw7MEssoLz3e09IrJ-aZyepzMsDY98KLnXfjzvuF4'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);