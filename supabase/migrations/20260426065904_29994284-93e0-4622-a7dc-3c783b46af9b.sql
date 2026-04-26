-- Per-fence org-wide dispatch policy
DO $$ BEGIN
  CREATE TYPE public.geofence_dispatch_policy AS ENUM ('prefer', 'avoid', 'neutral');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.geofences
  ADD COLUMN IF NOT EXISTS dispatch_policy public.geofence_dispatch_policy NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS dispatch_priority smallint NOT NULL DEFAULT 5
    CHECK (dispatch_priority BETWEEN 0 AND 10);

COMMENT ON COLUMN public.geofences.dispatch_policy IS
  'How the AI route recommender treats this zone: prefer routes through it, avoid them, or no preference.';
COMMENT ON COLUMN public.geofences.dispatch_priority IS
  'Weight 0-10 used by the AI to break ties between conflicting prefer/avoid zones.';

-- Per-request override surfaced in the consolidated trip map
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS geofence_aware_dispatch boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS geofence_avoid_overrides uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.vehicle_requests.geofence_aware_dispatch IS
  'When false, the AI route recommender ignores all geofence policies for this single trip.';
COMMENT ON COLUMN public.vehicle_requests.geofence_avoid_overrides IS
  'Geofence ids the dispatcher has flagged as avoid for THIS trip only (e.g. one-off road closure).';