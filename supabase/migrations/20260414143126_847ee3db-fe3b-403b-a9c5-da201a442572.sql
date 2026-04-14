-- Update device validation to accept Traccar Client short identifiers (min 5 chars)
CREATE OR REPLACE FUNCTION public.validate_device_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF trim(NEW.imei) = '' THEN
    RAISE EXCEPTION 'Device IMEI must not be empty or blank.';
  END IF;
  IF trim(NEW.tracker_model) = '' THEN
    RAISE EXCEPTION 'Device tracker_model must not be empty or blank.';
  END IF;
  IF length(NEW.imei) < 5 OR length(NEW.imei) > 20 THEN
    RAISE EXCEPTION 'Device IMEI must be between 5 and 20 characters.';
  END IF;
  RETURN NEW;
END;
$function$;