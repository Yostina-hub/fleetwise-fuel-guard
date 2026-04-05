
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
 RETURNS TABLE(is_locked boolean, lockout_until timestamp with time zone, failed_attempts integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE v_lockout RECORD;
BEGIN
  SELECT * INTO v_lockout FROM account_lockouts 
  WHERE account_lockouts.email = p_email 
  ORDER BY created_at DESC LIMIT 1;

  IF v_lockout IS NOT NULL AND v_lockout.lockout_until IS NOT NULL AND v_lockout.lockout_until > now() THEN
    RETURN QUERY SELECT TRUE, v_lockout.lockout_until, v_lockout.failed_attempts;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::timestamptz, COALESCE(v_lockout.failed_attempts, 0);
END;
$$;
