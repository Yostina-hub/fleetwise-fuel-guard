-- 1) Strip remaining %.0f specifiers
DO $$
DECLARE v_src text;
BEGIN
  SELECT prosrc INTO v_src FROM pg_proc WHERE proname='sync_fuel_request_workflow';
  v_src := replace(v_src, '%.0f', '%s');
  EXECUTE 'CREATE OR REPLACE FUNCTION public.sync_fuel_request_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS $f$' || v_src || '$f$';
END $$;

-- 2) Allow 'vehicle_request' as a valid audit source
ALTER TABLE public.delegation_audit_log
  DROP CONSTRAINT IF EXISTS delegation_audit_log_source_table_check;
ALTER TABLE public.delegation_audit_log
  ADD CONSTRAINT delegation_audit_log_source_table_check
  CHECK (source_table = ANY (ARRAY[
    'authority_matrix','delegation_matrix',
    'fuel_request','trip_request','vehicle_request',
    'outsource_payment_request','tire_request','maintenance_request'
  ]));