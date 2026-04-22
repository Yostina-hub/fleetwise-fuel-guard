-- Notify the requester to rate their trip when it completes without a rating.
-- Fires when a vehicle_request transitions into a "completed" state
-- (status -> completed/closed OR driver_checked_out_at gets set) and
-- rated_at is still NULL. Inserts a notification with a link that opens the
-- rating dialog directly on the requester portal: /my-requests?rate=<id>.

CREATE OR REPLACE FUNCTION public.notify_requester_to_rate_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  became_complete boolean := false;
  v_route text;
BEGIN
  -- Only act once per trip — never bother the user again after they rate.
  IF NEW.rated_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Detect transition into a completed state (status flip OR driver checkout).
  IF TG_OP = 'INSERT' THEN
    became_complete := (NEW.status IN ('completed','closed'))
                       OR NEW.driver_checked_out_at IS NOT NULL;
  ELSE
    became_complete := (
      (NEW.status IN ('completed','closed') AND COALESCE(OLD.status,'') NOT IN ('completed','closed'))
      OR (NEW.driver_checked_out_at IS NOT NULL AND OLD.driver_checked_out_at IS NULL)
    );
  END IF;

  IF NOT became_complete OR NEW.requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_route := COALESCE(
    NULLIF(trim(concat_ws(' → ', NEW.departure_place, NEW.destination)), '→'),
    NEW.purpose,
    'your trip'
  );

  INSERT INTO public.notifications (
    organization_id, user_id, type, title, message, link, metadata
  ) VALUES (
    NEW.organization_id,
    NEW.requester_id,
    'trip_rating_pending',
    'Rate your completed trip',
    format('How was %s? Tap to rate the driver, vehicle and punctuality.', v_route),
    format('/my-requests?rate=%s', NEW.id),
    jsonb_build_object(
      'vehicle_request_id', NEW.id,
      'request_number', NEW.request_number
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_requester_to_rate_trip_ins ON public.vehicle_requests;
DROP TRIGGER IF EXISTS trg_notify_requester_to_rate_trip_upd ON public.vehicle_requests;

CREATE TRIGGER trg_notify_requester_to_rate_trip_ins
AFTER INSERT ON public.vehicle_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_requester_to_rate_trip();

CREATE TRIGGER trg_notify_requester_to_rate_trip_upd
AFTER UPDATE OF status, driver_checked_out_at ON public.vehicle_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_requester_to_rate_trip();