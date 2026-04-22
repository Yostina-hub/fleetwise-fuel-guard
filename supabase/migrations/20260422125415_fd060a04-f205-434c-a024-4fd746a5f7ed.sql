-- Auto-sync vehicle odometer from live GPS telemetry.
-- The telemetry pipeline writes odometer_km on every update; we propagate the
-- highest observed value back to public.vehicles so the registered baseline
-- (set at vehicle registration) keeps growing as the vehicle moves.

CREATE OR REPLACE FUNCTION public.sync_vehicle_odometer_from_telemetry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_odo NUMERIC;
  new_odo NUMERIC;
BEGIN
  -- Only act when telemetry actually carries an odometer reading.
  IF NEW.odometer_km IS NULL OR NEW.odometer_km <= 0 THEN
    RETURN NEW;
  END IF;

  -- Reject obviously bad values (above 2,000,000 km is the gateway's hard cap).
  IF NEW.odometer_km > 2000000 THEN
    RETURN NEW;
  END IF;

  SELECT odometer_km INTO current_odo
  FROM public.vehicles
  WHERE id = NEW.vehicle_id;

  -- Monotonic: never let the live odometer fall below the registered/last value.
  new_odo := GREATEST(COALESCE(current_odo, 0), NEW.odometer_km);

  IF current_odo IS DISTINCT FROM new_odo THEN
    UPDATE public.vehicles
    SET odometer_km = new_odo,
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_odometer_ins ON public.vehicle_telemetry;
DROP TRIGGER IF EXISTS trg_sync_vehicle_odometer_upd ON public.vehicle_telemetry;

CREATE TRIGGER trg_sync_vehicle_odometer_ins
AFTER INSERT ON public.vehicle_telemetry
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_odometer_from_telemetry();

CREATE TRIGGER trg_sync_vehicle_odometer_upd
AFTER UPDATE OF odometer_km ON public.vehicle_telemetry
FOR EACH ROW
WHEN (NEW.odometer_km IS DISTINCT FROM OLD.odometer_km)
EXECUTE FUNCTION public.sync_vehicle_odometer_from_telemetry();

-- Backfill: pull the highest known odometer from telemetry into vehicles.
UPDATE public.vehicles v
SET odometer_km = GREATEST(COALESCE(v.odometer_km, 0), t.odometer_km),
    updated_at = now()
FROM public.vehicle_telemetry t
WHERE t.vehicle_id = v.id
  AND t.odometer_km IS NOT NULL
  AND t.odometer_km > 0
  AND t.odometer_km <= 2000000
  AND COALESCE(v.odometer_km, 0) < t.odometer_km;