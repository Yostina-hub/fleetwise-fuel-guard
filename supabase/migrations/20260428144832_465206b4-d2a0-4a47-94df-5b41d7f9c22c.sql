-- Extend the shared-ride passenger trigger so that, in addition to
-- notifying the driver, it also notifies every PASSENGER on the ride:
--   • The newly-added passenger gets a "You've been added to a shared trip" notice
--   • Existing co-passengers get a "A new co-passenger joined your trip" notice
-- This drives the realtime toast + inbox bell on the requester / passenger side.

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
  v_link text;
  v_co RECORD;
  v_total_pax int;
BEGIN
  SELECT sr.id, sr.driver_id, sr.organization_id, sr.origin_label,
         sr.destination_label, sr.departure_at, sr.vehicle_id, sr.pool_code
    INTO v_ride
  FROM public.shared_rides sr
  WHERE sr.id = NEW.shared_ride_id;

  IF v_ride.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve display name of the new passenger
  IF NEW.passenger_user_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email, 'Passenger')
      INTO v_passenger_name
    FROM public.profiles
    WHERE id = NEW.passenger_user_id
    LIMIT 1;
  END IF;
  v_passenger_name := COALESCE(v_passenger_name, 'A new passenger');

  v_link := '/my-requests?ride=' || v_ride.id::text
            || COALESCE('&request=' || NEW.vehicle_request_id::text, '');

  -- ===== 1. Driver notification (existing behaviour) =====
  IF v_ride.driver_id IS NOT NULL THEN
    SELECT user_id INTO v_driver_user
    FROM public.drivers
    WHERE id = v_ride.driver_id
    LIMIT 1;

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
  END IF;

  SELECT count(*) INTO v_total_pax
  FROM public.shared_ride_passengers
  WHERE shared_ride_id = v_ride.id
    AND status NOT IN ('cancelled', 'no_show');

  -- ===== 2. Notify the NEW passenger themselves =====
  IF NEW.passenger_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      organization_id, user_id, type, title, message, link, metadata
    ) VALUES (
      v_ride.organization_id,
      NEW.passenger_user_id,
      'shared_trip_joined',
      'You''ve been added to a shared trip',
      COALESCE(v_ride.origin_label, 'Origin') || ' → '
        || COALESCE(v_ride.destination_label, 'Destination')
        || ' • ' || v_total_pax || ' passenger'
        || CASE WHEN v_total_pax = 1 THEN '' ELSE 's' END || ' total',
      v_link,
      jsonb_build_object(
        'shared_ride_id',     v_ride.id,
        'passenger_id',       NEW.id,
        'vehicle_request_id', NEW.vehicle_request_id,
        'pool_code',          v_ride.pool_code,
        'pickup_label',       NEW.pickup_label,
        'pickup_lat',         NEW.pickup_lat,
        'pickup_lng',         NEW.pickup_lng,
        'dropoff_label',      NEW.dropoff_label,
        'dropoff_lat',        NEW.dropoff_lat,
        'dropoff_lng',        NEW.dropoff_lng,
        'origin_label',       v_ride.origin_label,
        'destination_label',  v_ride.destination_label,
        'departure_at',       v_ride.departure_at,
        'total_passengers',   v_total_pax
      )
    );
  END IF;

  -- ===== 3. Notify every EXISTING co-passenger =====
  FOR v_co IN
    SELECT DISTINCT srp.passenger_user_id, srp.vehicle_request_id, srp.id
    FROM public.shared_ride_passengers srp
    WHERE srp.shared_ride_id = v_ride.id
      AND srp.id <> NEW.id
      AND srp.passenger_user_id IS NOT NULL
      AND srp.status NOT IN ('cancelled', 'no_show')
  LOOP
    INSERT INTO public.notifications (
      organization_id, user_id, type, title, message, link, metadata
    ) VALUES (
      v_ride.organization_id,
      v_co.passenger_user_id,
      'shared_trip_co_passenger_added',
      'A new co-passenger joined your trip',
      v_passenger_name || ' joined • Pickup: '
        || COALESCE(NEW.pickup_label, 'see map'),
      '/my-requests?ride=' || v_ride.id::text
        || COALESCE('&request=' || v_co.vehicle_request_id::text, ''),
      jsonb_build_object(
        'shared_ride_id',          v_ride.id,
        'new_passenger_id',        NEW.id,
        'new_passenger_name',      v_passenger_name,
        'new_pickup_label',        NEW.pickup_label,
        'new_pickup_lat',          NEW.pickup_lat,
        'new_pickup_lng',          NEW.pickup_lng,
        'new_dropoff_label',       NEW.dropoff_label,
        'origin_label',            v_ride.origin_label,
        'destination_label',       v_ride.destination_label,
        'departure_at',            v_ride.departure_at,
        'total_passengers',        v_total_pax,
        'my_vehicle_request_id',   v_co.vehicle_request_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;