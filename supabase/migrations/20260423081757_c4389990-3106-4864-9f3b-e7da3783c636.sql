-- Fix: rating gate must respect the bypass_rating_gate permission of the
-- actual signed-in user (auth.uid()) — not the requester_id of the row.
-- Previously, when an admin or super_admin filed a request on behalf of
-- another user (or impersonated them), the trigger blocked on the target
-- user's unrated trips even though the admin was granted bypass.
--
-- We now skip the check when the actor (auth.uid()) holds the
-- `vehicle_requests.bypass_rating_gate` permission.
CREATE OR REPLACE FUNCTION public.enforce_rate_before_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pending_count integer;
  actor_id uuid := auth.uid();
BEGIN
  -- Allow the caller to bypass the gate when granted the permission.
  -- This covers super admins, org admins, fleet managers, and any role
  -- that the org has explicitly granted bypass via the RBAC matrix.
  IF actor_id IS NOT NULL
     AND public.has_permission(actor_id, 'vehicle_requests.bypass_rating_gate')
  THEN
    RETURN NEW;
  END IF;

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