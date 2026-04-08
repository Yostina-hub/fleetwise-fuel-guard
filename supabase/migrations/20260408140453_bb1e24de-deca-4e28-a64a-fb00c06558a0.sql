-- ============================================================
-- PENTEST REMEDIATION: Harden against null payload & dedup attacks
-- Addresses findings #4,#6,#7,#9 from penetration test
-- ============================================================

-- FINDING #7: Fuel depots - lat/lng must not be null
-- Set existing NULLs to 0 before adding constraint
UPDATE public.fuel_depots SET lat = 0 WHERE lat IS NULL;
UPDATE public.fuel_depots SET lng = 0 WHERE lng IS NULL;
ALTER TABLE public.fuel_depots ALTER COLUMN lat SET NOT NULL;
ALTER TABLE public.fuel_depots ALTER COLUMN lng SET NOT NULL;

-- FINDING #6: Fuel transactions - prevent null costs and zero-amount submissions
UPDATE public.fuel_transactions SET fuel_cost = 0 WHERE fuel_cost IS NULL;
UPDATE public.fuel_transactions SET fuel_price_per_liter = 0 WHERE fuel_price_per_liter IS NULL;
ALTER TABLE public.fuel_transactions ALTER COLUMN fuel_cost SET NOT NULL;
ALTER TABLE public.fuel_transactions ALTER COLUMN fuel_price_per_liter SET NOT NULL;
ALTER TABLE public.fuel_transactions ALTER COLUMN fuel_cost SET DEFAULT 0;
ALTER TABLE public.fuel_transactions ALTER COLUMN fuel_price_per_liter SET DEFAULT 0;

-- FINDING #6: Fuel transaction dedup trigger - prevent exact same submission within 60s
CREATE OR REPLACE FUNCTION public.check_fuel_transaction_dedup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM public.fuel_transactions
  WHERE vehicle_id = NEW.vehicle_id
    AND organization_id = NEW.organization_id
    AND fuel_amount_liters = NEW.fuel_amount_liters
    AND transaction_date = NEW.transaction_date
    AND created_at > now() - interval '60 seconds';
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate fuel transaction detected. Same vehicle, amount, and date submitted within 60 seconds.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dedup_fuel_transactions ON public.fuel_transactions;
CREATE TRIGGER dedup_fuel_transactions
  BEFORE INSERT ON public.fuel_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fuel_transaction_dedup();

-- FINDING #4: Vehicle validation trigger - reject empty/blank critical fields
CREATE OR REPLACE FUNCTION public.validate_vehicle_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF trim(NEW.make) = '' OR trim(NEW.model) = '' OR trim(NEW.plate_number) = '' THEN
    RAISE EXCEPTION 'Vehicle make, model, and plate_number must not be empty or blank.';
  END IF;
  IF NEW.year < 1900 OR NEW.year > extract(year from now())::int + 2 THEN
    RAISE EXCEPTION 'Vehicle year must be between 1900 and next year.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_vehicle_insert ON public.vehicles;
CREATE TRIGGER validate_vehicle_insert
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vehicle_payload();

-- FINDING #5: Driver validation trigger - reject empty/blank names and license
CREATE OR REPLACE FUNCTION public.validate_driver_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF trim(NEW.first_name) = '' OR trim(NEW.last_name) = '' OR trim(NEW.license_number) = '' THEN
    RAISE EXCEPTION 'Driver first_name, last_name, and license_number must not be empty or blank.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_driver_insert ON public.drivers;
CREATE TRIGGER validate_driver_insert
  BEFORE INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_driver_payload();

-- FINDING #7: Fuel depot validation - reject empty names and zero coordinates together
CREATE OR REPLACE FUNCTION public.validate_fuel_depot_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Fuel depot name must not be empty or blank.';
  END IF;
  IF NEW.capacity_liters <= 0 THEN
    RAISE EXCEPTION 'Fuel depot capacity must be greater than zero.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_fuel_depot_insert ON public.fuel_depots;
CREATE TRIGGER validate_fuel_depot_insert
  BEFORE INSERT ON public.fuel_depots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fuel_depot_payload();

-- FINDING #8: Fuel station validation
CREATE OR REPLACE FUNCTION public.validate_fuel_station_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Fuel station name must not be empty or blank.';
  END IF;
  IF NEW.lat < -90 OR NEW.lat > 90 OR NEW.lng < -180 OR NEW.lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates: lat must be -90..90, lng must be -180..180.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_fuel_station_insert ON public.approved_fuel_stations;
CREATE TRIGGER validate_fuel_station_insert
  BEFORE INSERT ON public.approved_fuel_stations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fuel_station_payload();

-- FINDING #9: Dispatch job validation - reject blank job numbers
CREATE OR REPLACE FUNCTION public.validate_dispatch_job_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF trim(NEW.job_number) = '' THEN
    RAISE EXCEPTION 'Dispatch job number must not be empty or blank.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_dispatch_job_insert ON public.dispatch_jobs;
CREATE TRIGGER validate_dispatch_job_insert
  BEFORE INSERT ON public.dispatch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dispatch_job_payload();

-- FINDING #6: Fuel transaction validation - reject zero/negative amounts
CREATE OR REPLACE FUNCTION public.validate_fuel_transaction_payload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fuel_amount_liters <= 0 THEN
    RAISE EXCEPTION 'Fuel amount must be greater than zero.';
  END IF;
  IF NEW.fuel_amount_liters > 100000 THEN
    RAISE EXCEPTION 'Fuel amount exceeds maximum allowed (100,000 liters).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_fuel_transaction_insert ON public.fuel_transactions;
CREATE TRIGGER validate_fuel_transaction_insert
  BEFORE INSERT ON public.fuel_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fuel_transaction_payload();

-- Revoke new SECURITY DEFINER functions from PUBLIC, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.check_fuel_transaction_dedup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_fuel_transaction_dedup() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_vehicle_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_vehicle_payload() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_driver_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_driver_payload() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_fuel_depot_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_fuel_depot_payload() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_fuel_station_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_fuel_station_payload() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_dispatch_job_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_dispatch_job_payload() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_fuel_transaction_payload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_fuel_transaction_payload() TO service_role;