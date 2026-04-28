CREATE OR REPLACE FUNCTION public.notify_driver_on_passenger_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_driver_user uuid;
  v_passenger_name text;
BEGIN
  SELECT sr.id, sr.driver_id, sr.organization_id, sr.origin_label,
         sr.destination_label, sr.departure_at, sr.vehicle_id
    INTO v_ride
  FROM public.shared_rides sr
  WHERE sr.id = NEW.shared_ride_id;

  IF v_ride.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_driver_user
  FROM public.drivers
  WHERE id = v_ride.driver_id
  LIMIT 1;

  IF NEW.passenger_user_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email, 'Passenger')
      INTO v_passenger_name
    FROM public.profiles
    WHERE id = NEW.passenger_user_id
    LIMIT 1;
  END IF;
  v_passenger_name := COALESCE(v_passenger_name, 'A new passenger');

  INSERT INTO public.driver_notifications (
    organization_id, driver_id, user_id, kind, title, body, link, payload
  ) VALUES (
    v_ride.organization_id,
    v_ride.driver_id,
    v_driver_user,
    'passenger_added',
    'New passenger on your shared trip',
    v_passenger_name || ' • Pickup: ' || COALESCE(NEW.pickup_label, 'see map')
      || ' → Drop-off: ' || COALESCE(NEW.dropoff_label, 'see map'),
    '/driver-portal?tab=shared&ride=' || v_ride.id::text,
    jsonb_build_object(
      'shared_ride_id',     v_ride.id,
      'passenger_id',       NEW.id,
      'vehicle_request_id', NEW.vehicle_request_id,
      'passenger_name',     v_passenger_name,
      'pickup_label',       NEW.pickup_label,
      'pickup_lat',         NEW.pickup_lat,
      'pickup_lng',         NEW.pickup_lng,
      'dropoff_label',      NEW.dropoff_label,
      'dropoff_lat',        NEW.dropoff_lat,
      'dropoff_lng',        NEW.dropoff_lng,
      'seats',              NEW.seats,
      'origin_label',       v_ride.origin_label,
      'destination_label',  v_ride.destination_label,
      'departure_at',       v_ride.departure_at
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_srp_notify_driver ON public.shared_ride_passengers;
CREATE TRIGGER trg_srp_notify_driver
  AFTER INSERT ON public.shared_ride_passengers
  FOR EACH ROW EXECUTE FUNCTION public.notify_driver_on_passenger_added();