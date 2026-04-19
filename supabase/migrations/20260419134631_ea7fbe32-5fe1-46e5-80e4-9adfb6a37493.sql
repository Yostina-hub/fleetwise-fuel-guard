CREATE OR REPLACE FUNCTION public._diag_driver_auth_status()
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  user_id uuid,
  exists_in_auth boolean,
  has_password boolean,
  email_confirmed boolean,
  has_driver_role boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    (d.first_name || ' ' || d.last_name)::text,
    d.user_id,
    (u.id IS NOT NULL),
    (u.encrypted_password IS NOT NULL AND length(u.encrypted_password) > 0),
    (u.email_confirmed_at IS NOT NULL),
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = d.user_id AND ur.role = 'driver')
  FROM public.drivers d
  LEFT JOIN auth.users u ON u.id = d.user_id
  WHERE d.user_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._diag_driver_auth_status() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._diag_driver_auth_status() TO postgres, service_role;