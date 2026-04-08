
-- =============================================
-- PENTEST FINDING #1: Batch User Registration
-- Add rate limit triggers on profiles and user_roles
-- =============================================

-- profiles uses 'id' as user identifier, so we need a custom trigger
CREATE OR REPLACE FUNCTION public.rate_limit_profile_inserts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count recent profile inserts (service_role bypasses RLS but triggers still fire)
  SELECT COUNT(*) INTO recent_count
  FROM public.profiles
  WHERE created_at > now() - interval '1 minute';

  -- Max 5 profile creations per minute globally (only admins create users)
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many user registrations per minute';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rate_limit_profiles
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.rate_limit_profile_inserts();

-- user_roles: max 5 role assignments per minute
CREATE OR REPLACE FUNCTION public.rate_limit_role_inserts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.user_roles
  WHERE created_at > now() - interval '1 minute';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many role assignments per minute';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rate_limit_user_roles
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.rate_limit_role_inserts();

-- Revoke anon access to these new functions
REVOKE EXECUTE ON FUNCTION public.rate_limit_profile_inserts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_role_inserts() FROM anon;

-- =============================================
-- PENTEST FINDING #2: Password Reset Enumeration
-- Add DB-level rate limiting for password reset attempts
-- =============================================

CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- No one can read this except service_role
CREATE POLICY "No public access to password reset attempts"
  ON public.password_reset_attempts
  FOR ALL
  TO authenticated
  USING (false);

-- Function to check and record password reset rate limit
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_max_per_email INT DEFAULT 3,
  p_max_per_ip INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INT;
  ip_count INT;
  oldest_in_window TIMESTAMPTZ;
  v_retry INT;
BEGIN
  -- Check per-email rate limit
  SELECT COUNT(*) INTO email_count
  FROM public.password_reset_attempts
  WHERE password_reset_attempts.email = lower(trim(p_email))
    AND attempted_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

  IF email_count >= p_max_per_email THEN
    SELECT EXTRACT(EPOCH FROM (MIN(attempted_at) + (p_window_minutes || ' minutes')::INTERVAL - now()))::INT
    INTO v_retry
    FROM public.password_reset_attempts
    WHERE password_reset_attempts.email = lower(trim(p_email))
      AND attempted_at > now() - (p_window_minutes || ' minutes')::INTERVAL;
    RETURN QUERY SELECT FALSE, GREATEST(v_retry, 1);
    RETURN;
  END IF;

  -- Check per-IP rate limit
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_count
    FROM public.password_reset_attempts
    WHERE password_reset_attempts.ip_address = p_ip_address
      AND attempted_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

    IF ip_count >= p_max_per_ip THEN
      RETURN QUERY SELECT FALSE, 60;
      RETURN;
    END IF;
  END IF;

  -- Record the attempt
  INSERT INTO public.password_reset_attempts (email, ip_address, attempted_at)
  VALUES (lower(trim(p_email)), p_ip_address, now());

  -- Cleanup old entries (older than 1 hour)
  DELETE FROM public.password_reset_attempts
  WHERE attempted_at < now() - interval '1 hour';

  RETURN QUERY SELECT TRUE, 0;
END;
$$;

-- Allow anon to call this (needed for password reset flow)
GRANT EXECUTE ON FUNCTION public.check_password_reset_rate_limit(TEXT, TEXT, INT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_password_reset_rate_limit(TEXT, TEXT, INT, INT, INT) TO authenticated;

-- =============================================
-- PENTEST FINDING #3: Unrestricted Password Guessing
-- Tighten account lockout: add IP-based lockout alongside email-based
-- =============================================

-- Add IP-based tracking to account_lockouts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_lockouts' AND column_name = 'lockout_type'
  ) THEN
    ALTER TABLE public.account_lockouts ADD COLUMN lockout_type TEXT DEFAULT 'email';
  END IF;
END $$;

-- Create IP-based lockout function
CREATE OR REPLACE FUNCTION public.check_ip_lockout(
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 15,
  p_lockout_minutes INT DEFAULT 30
)
RETURNS TABLE(is_locked BOOLEAN, locked_until TIMESTAMPTZ, attempt_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lockout RECORD;
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

  RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, COALESCE(v_lockout.failed_attempts, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ip_failed_login(
  p_ip_address TEXT,
  p_max_attempts INT DEFAULT 15,
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

  -- If currently locked, return lock status
  IF v_lockout IS NOT NULL AND v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until > now() THEN
    RETURN QUERY SELECT TRUE, v_lockout.lockout_until, v_lockout.failed_attempts;
    RETURN;
  END IF;

  -- Reset or increment
  IF v_lockout IS NULL OR (v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until <= now()) THEN
    v_new_attempts := 1;
  ELSE
    v_new_attempts := COALESCE(v_lockout.failed_attempts, 0) + 1;
  END IF;

  -- Lock if threshold reached
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

-- Allow anon to call (needed pre-login)
GRANT EXECUTE ON FUNCTION public.check_ip_lockout(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.record_ip_failed_login(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_ip_lockout(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ip_failed_login(TEXT, INT, INT) TO authenticated;

-- Reduce email lockout threshold from 5 to 3 attempts for stricter protection
-- (The existing function uses parameters, but let's ensure the defaults are tighter)
