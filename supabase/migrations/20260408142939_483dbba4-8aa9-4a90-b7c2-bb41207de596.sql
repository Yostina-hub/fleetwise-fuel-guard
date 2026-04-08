
-- FIX: Revoke anon from trigger functions that don't need anon access
REVOKE EXECUTE ON FUNCTION public.rate_limit_profile_inserts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_role_inserts() FROM anon;

-- FIX: Add rate_limit_inserts trigger to high-risk tables missing it
-- These are tables that accept user-created data and could be batch-attacked

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.dispatch_pod
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.device_commands
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.driver_communications
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.driver_coaching_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.driver_goals
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.driver_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.driver_wellness_checks
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.sensors
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_inserts BEFORE INSERT ON public.work_order_parts
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- FIX: Validation triggers for devices and geofences (null payload attacks)
CREATE OR REPLACE FUNCTION public.validate_device_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(NEW.imei) = '' THEN
    RAISE EXCEPTION 'Device IMEI must not be empty or blank.';
  END IF;
  IF trim(NEW.tracker_model) = '' THEN
    RAISE EXCEPTION 'Device tracker_model must not be empty or blank.';
  END IF;
  IF length(NEW.imei) < 10 OR length(NEW.imei) > 20 THEN
    RAISE EXCEPTION 'Device IMEI must be between 10 and 20 characters.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_device_insert
  BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.validate_device_payload();

REVOKE EXECUTE ON FUNCTION public.validate_device_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_device_payload() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.validate_geofence_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Geofence name must not be empty or blank.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_geofence_insert
  BEFORE INSERT OR UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION public.validate_geofence_payload();

REVOKE EXECUTE ON FUNCTION public.validate_geofence_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_geofence_payload() FROM PUBLIC;

-- FIX: Tighten account lockout - reduce from 5 to 3 attempts
-- We replace the record_failed_login function with stricter defaults
CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_email TEXT,
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 3,
  p_lockout_minutes INT DEFAULT 15
)
RETURNS TABLE(is_locked BOOLEAN, lockout_until TIMESTAMPTZ, failed_attempts INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lockout RECORD; v_new_attempts INT; v_lockout_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_lockout FROM account_lockouts WHERE account_lockouts.email = p_email AND (lockout_type = 'email' OR lockout_type IS NULL) ORDER BY created_at DESC LIMIT 1;
  IF v_lockout IS NOT NULL AND v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until > now() THEN
    RETURN QUERY SELECT TRUE, v_lockout.lockout_until, v_lockout.failed_attempts; RETURN;
  END IF;
  IF v_lockout IS NULL OR (v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until <= now()) THEN
    v_new_attempts := 1;
  ELSE v_new_attempts := COALESCE(v_lockout.failed_attempts, 0) + 1; END IF;
  IF v_new_attempts >= p_max_attempts THEN v_lockout_until := now() + (p_lockout_minutes || ' minutes')::INTERVAL;
  ELSE v_lockout_until := NULL; END IF;
  IF v_lockout IS NULL THEN
    INSERT INTO account_lockouts (email, ip_address, failed_attempts, lockout_until, lockout_reason, lockout_type, updated_at)
    VALUES (p_email, p_ip_address, v_new_attempts, v_lockout_until, CASE WHEN v_lockout_until IS NOT NULL THEN 'Too many failed login attempts' ELSE NULL END, 'email', now());
  ELSE
    UPDATE account_lockouts SET failed_attempts = v_new_attempts, lockout_until = v_lockout_until,
      lockout_reason = CASE WHEN v_lockout_until IS NOT NULL THEN 'Too many failed login attempts' ELSE NULL END,
      ip_address = p_ip_address, updated_at = now() WHERE id = v_lockout.id;
  END IF;
  RETURN QUERY SELECT v_lockout_until IS NOT NULL, v_lockout_until, v_new_attempts;
END;
$$;

-- Also tighten IP lockout from 15 to 10 attempts
CREATE OR REPLACE FUNCTION public.record_ip_failed_login(
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 10,
  p_lockout_minutes INT DEFAULT 30
)
RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ, attempt_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lockout RECORD;
  v_new_attempts INT;
  v_lockout_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_lockout
  FROM account_lockouts
  WHERE account_lockouts.ip_address = p_ip_address
    AND lockout_type = 'ip'
  ORDER BY created_at DESC LIMIT 1;

  IF v_lockout IS NOT NULL AND v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until > now() THEN
    RETURN QUERY SELECT TRUE, v_lockout.lockout_until, v_lockout.failed_attempts;
    RETURN;
  END IF;

  IF v_lockout IS NULL OR (v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until <= now()) THEN
    v_new_attempts := 1;
  ELSE
    v_new_attempts := COALESCE(v_lockout.failed_attempts, 0) + 1;
  END IF;

  IF v_new_attempts >= p_max_attempts THEN
    v_lockout_until := now() + (p_lockout_minutes || ' minutes')::INTERVAL;
  ELSE
    v_lockout_until := NULL;
  END IF;

  IF v_lockout IS NULL THEN
    INSERT INTO account_lockouts (ip_address, failed_attempts, lockout_until, lockout_reason, lockout_type, updated_at)
    VALUES (p_ip_address, v_new_attempts, v_lockout_until,
      CASE WHEN v_lockout_until IS NOT NULL THEN 'Too many failed login attempts from this IP' ELSE NULL END,
      'ip', now());
  ELSE
    UPDATE account_lockouts SET
      failed_attempts = v_new_attempts,
      lockout_until = v_lockout_until,
      lockout_reason = CASE WHEN v_lockout_until IS NOT NULL THEN 'Too many failed login attempts from this IP' ELSE NULL END,
      updated_at = now()
    WHERE id = v_lockout.id;
  END IF;

  RETURN QUERY SELECT v_lockout_until IS NOT NULL, v_lockout_until, v_new_attempts;
END;
$$;
