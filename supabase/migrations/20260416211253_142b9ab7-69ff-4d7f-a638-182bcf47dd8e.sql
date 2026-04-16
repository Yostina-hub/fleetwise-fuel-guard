-- Schedule fuel efficiency auto-trigger to run every hour
SELECT cron.schedule(
  'fuel-efficiency-auto-trigger-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/check-fuel-efficiency-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWp3bXlxYWtwcnFkaHJsc296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTc5NDIsImV4cCI6MjA3NjczMzk0Mn0.hcyw7MEssoLz3e09IrJ-aZyepzMsDY98KLnXfjzvuF4'
    ),
    body := jsonb_build_object('source', 'cron')
  ) AS request_id;
  $$
);