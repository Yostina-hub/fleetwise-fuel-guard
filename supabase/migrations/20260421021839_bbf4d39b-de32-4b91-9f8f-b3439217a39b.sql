-- ============================================================
-- Vehicle Request Rating Workflow
-- ============================================================
-- Adds 3-axis rating (driver, vehicle, punctuality) + enforcement
-- so requesters MUST rate completed trips before submitting a new one.

ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS driver_rating       integer CHECK (driver_rating       BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS vehicle_rating      integer CHECK (vehicle_rating      BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS punctuality_rating  integer CHECK (punctuality_rating  BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rated_at            timestamptz,
  ADD COLUMN IF NOT EXISTS rating_comment      text;

-- Helper view-style index for the trigger lookup
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_pending_ratings
  ON public.vehicle_requests (requester_id, organization_id)
  WHERE rated_at IS NULL
    AND (status IN ('completed','closed') OR driver_checked_out_at IS NOT NULL);

-- ------------------------------------------------------------
-- Trigger: block new vehicle requests when requester has prior
-- completed trips that haven't been rated yet.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_rate_before_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count integer;
BEGIN
  -- Only check on inserts, and only for the requester themselves.
  -- Dispatchers/managers creating requests on behalf of someone are still subject to the rule.
  SELECT COUNT(*) INTO pending_count
  FROM public.vehicle_requests
  WHERE requester_id    = NEW.requester_id
    AND organization_id = NEW.organization_id
    AND rated_at IS NULL
    AND (
      status IN ('completed','closed')
      OR driver_checked_out_at IS NOT NULL
    );

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'PENDING_RATINGS:%', pending_count
      USING HINT = 'Rate your previous completed trips before submitting a new request.',
            ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_rate_before_request ON public.vehicle_requests;
CREATE TRIGGER trg_enforce_rate_before_request
  BEFORE INSERT ON public.vehicle_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_rate_before_request();

-- ------------------------------------------------------------
-- Trigger: when 3-axis ratings are saved, auto-compute the
-- overall `requester_rating` (rounded average) and stamp `rated_at`.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_overall_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.driver_rating IS NOT NULL
     AND NEW.vehicle_rating IS NOT NULL
     AND NEW.punctuality_rating IS NOT NULL THEN
    NEW.requester_rating := ROUND(
      (NEW.driver_rating + NEW.vehicle_rating + NEW.punctuality_rating)::numeric / 3.0
    )::int;
    IF NEW.rated_at IS NULL THEN
      NEW.rated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_overall_rating ON public.vehicle_requests;
CREATE TRIGGER trg_compute_overall_rating
  BEFORE INSERT OR UPDATE OF driver_rating, vehicle_rating, punctuality_rating
  ON public.vehicle_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_overall_rating();