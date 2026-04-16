CREATE OR REPLACE FUNCTION public.auto_create_fuel_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing INT;
  v_station_name TEXT;
  v_station_lat NUMERIC;
  v_station_lng NUMERIC;
BEGIN
  IF NEW.status = 'fulfilled'
     AND (OLD.status IS NULL OR OLD.status <> 'fulfilled')
     AND NEW.actual_liters IS NOT NULL
     AND NEW.actual_liters > 0
     AND NEW.vehicle_id IS NOT NULL THEN

    SELECT COUNT(*) INTO v_existing
    FROM public.fuel_transactions
    WHERE organization_id = NEW.organization_id
      AND vehicle_id = NEW.vehicle_id
      AND notes LIKE 'FR:' || NEW.id::text || '%';
    IF v_existing > 0 THEN RETURN NEW; END IF;

    IF NEW.station_id IS NOT NULL THEN
      SELECT name, lat, lng
        INTO v_station_name, v_station_lat, v_station_lng
      FROM public.approved_fuel_stations
      WHERE id = NEW.station_id;
    END IF;

    INSERT INTO public.fuel_transactions (
      organization_id, vehicle_id, transaction_type, transaction_date,
      fuel_amount_liters, fuel_cost,
      fuel_price_per_liter,
      odometer_km, location_name, lat, lng,
      vendor_name, notes
    ) VALUES (
      NEW.organization_id, NEW.vehicle_id, 'refuel',
      COALESCE(NEW.fulfilled_at, now()),
      NEW.actual_liters, NEW.actual_cost,
      CASE WHEN NEW.actual_cost IS NOT NULL AND NEW.actual_liters > 0
           THEN ROUND((NEW.actual_cost / NEW.actual_liters)::numeric, 2) END,
      NEW.current_odometer,
      v_station_name, v_station_lat, v_station_lng,
      v_station_name,
      'FR:' || NEW.id::text || ' [auto-created from fuel request ' || COALESCE(NEW.request_number, NEW.id::text) || ']'
    );
  END IF;
  RETURN NEW;
END;
$function$;