-- Function to check if an email belongs to an SSO/AD-managed domain
CREATE OR REPLACE FUNCTION public.is_sso_managed_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.identity_provider_configs ipc
    WHERE ipc.is_active = true
      AND ipc.domains IS NOT NULL
      AND lower(split_part(_email, '@', 2)) = ANY (
        SELECT lower(d) FROM unnest(ipc.domains) AS d
      )
  );
$$;

-- Allow anonymous + authenticated callers (used from Auth page before login)
GRANT EXECUTE ON FUNCTION public.is_sso_managed_email(text) TO anon, authenticated;