
-- These two functions MUST be callable by anon because they're used during the login flow
-- before the user has authenticated
GRANT EXECUTE ON FUNCTION public.check_account_lockout(text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text, integer, integer) TO anon;
