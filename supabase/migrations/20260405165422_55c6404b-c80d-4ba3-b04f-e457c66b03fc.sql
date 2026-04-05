
-- Finding #4: Add rate-limit trigger to vehicles table (was missing)
CREATE TRIGGER rate_limit_inserts
BEFORE INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();
