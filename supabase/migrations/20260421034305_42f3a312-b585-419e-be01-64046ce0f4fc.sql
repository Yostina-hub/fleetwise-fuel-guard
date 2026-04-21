-- Working-hours policy for vehicle requests (per-tenant, configurable).
-- Used by the Vehicle Request form to block Project / operational trips
-- that fall outside the org's working window.
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS vr_working_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  ADD COLUMN IF NOT EXISTS vr_working_start_time time NOT NULL DEFAULT '08:00'::time,
  ADD COLUMN IF NOT EXISTS vr_working_end_time   time NOT NULL DEFAULT '17:00'::time;

COMMENT ON COLUMN public.organization_settings.vr_working_days IS
  'Allowed weekdays for Project / operational vehicle requests. 0=Sun, 6=Sat.';
COMMENT ON COLUMN public.organization_settings.vr_working_start_time IS
  'Daily working window START for Project / operational vehicle requests.';
COMMENT ON COLUMN public.organization_settings.vr_working_end_time IS
  'Daily working window END for Project / operational vehicle requests.';