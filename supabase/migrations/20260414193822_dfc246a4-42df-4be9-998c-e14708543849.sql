ALTER TABLE public.device_terminal_settings
ADD COLUMN IF NOT EXISTS reporting_interval_moving integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS reporting_interval_stationary integer NOT NULL DEFAULT 600,
ADD COLUMN IF NOT EXISTS min_reporting_interval integer NOT NULL DEFAULT 1;