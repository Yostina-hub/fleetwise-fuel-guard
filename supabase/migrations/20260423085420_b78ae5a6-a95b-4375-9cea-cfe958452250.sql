-- Make the "rate prior trips before requesting" gate respect each
-- organization's requester_rating_required toggle. When the toggle is OFF,
-- requesters can submit new requests even with unrated prior trips.
CREATE OR REPLACE FUNCTION public.enforce_rate_before_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pending_count integer;
  rating_required boolean;
  actor_id uuid := auth.uid();
BEGIN
  -- 1. Permission-based bypass (super admin, fleet manager, etc.)
  IF actor_id IS NOT NULL
     AND public.has_permission(actor_id, 'vehicle_requests.bypass_rating_gate')
  THEN
    RETURN NEW;
  END IF;

  -- 2. Org-level toggle. If the org has NOT enabled mandatory rating,
  --    let the request through regardless of pending ratings.
  SELECT COALESCE(requester_rating_required, false)
    INTO rating_required
    FROM public.organization_settings
   WHERE organization_id = NEW.organization_id;

  IF NOT COALESCE(rating_required, false) THEN
    RETURN NEW;
  END IF;

  -- 3. Toggle on → block if there are unrated completed trips.
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
$function$;