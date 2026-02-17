
CREATE TRIGGER rate_limit_inserts
BEFORE INSERT ON public.approved_fuel_stations
FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();
