
-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Create a tracking table for cron job execution history
CREATE TABLE IF NOT EXISTS public.cron_job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer,
  status text NOT NULL DEFAULT 'success',
  details text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.cron_job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron job history"
  ON public.cron_job_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Schedule: Refresh materialized views every 5 minutes
SELECT cron.schedule(
  'refresh-telemetry-aggregates',
  '*/5 * * * *',
  $$SELECT public.refresh_telemetry_aggregates()$$
);

-- Schedule: Cleanup old telemetry partitions monthly (retains 6 months)
SELECT cron.schedule(
  'cleanup-old-telemetry',
  '0 3 1 * *',
  $$
  INSERT INTO public.cron_job_history (job_name, details)
  VALUES ('cleanup-old-telemetry', (SELECT public.cleanup_old_telemetry(6)));
  $$
);

-- Schedule: Log aggregate refresh completion every 5 min
SELECT cron.schedule(
  'log-aggregate-refresh',
  '1,6,11,16,21,26,31,36,41,46,51,56 * * * *',
  $$
  INSERT INTO public.cron_job_history (job_name, status, details)
  VALUES ('refresh-telemetry-aggregates', 'success', 'Materialized views refreshed');
  $$
);
