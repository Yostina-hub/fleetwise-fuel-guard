DO $$
DECLARE v_src text;
BEGIN
  SELECT prosrc INTO v_src FROM pg_proc WHERE proname='sync_fuel_request_workflow';
  v_src := replace(v_src, '%.0f L, ~%s ETB', '%s L, ~%s ETB');
  EXECUTE 'CREATE OR REPLACE FUNCTION public.sync_fuel_request_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS $f$' || v_src || '$f$';
END $$;