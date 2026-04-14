
DO $body$
DECLARE
  part record;
BEGIN
  FOR part IN
    SELECT c.relname
    FROM pg_inherits JOIN pg_class c ON c.oid = inhrelid
    WHERE inhparent = 'public.telemetry_events'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part.relname);
  END LOOP;
END $body$;
