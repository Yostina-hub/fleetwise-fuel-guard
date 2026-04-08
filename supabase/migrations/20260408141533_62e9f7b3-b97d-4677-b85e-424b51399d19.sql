
-- PART 1: Revoke anon execute on trigger/validation functions
REVOKE EXECUTE ON FUNCTION public.check_fuel_transaction_dedup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_dispatch_job_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_driver_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_fuel_depot_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_fuel_station_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_fuel_transaction_payload() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_vehicle_payload() FROM anon;

-- PART 2: Migrate all PUBLIC role policies to authenticated
DO $$
DECLARE
  pol RECORD;
  sql_text TEXT;
  cmd_clause TEXT;
  using_clause TEXT;
  check_clause TEXT;
BEGIN
  FOR pol IN 
    SELECT c.relname AS tablename, p.polname AS policyname, p.polcmd,
           CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
           pg_get_expr(p.polqual, p.polrelid) AS qual_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.polroles = '{0}'
    ORDER BY c.relname, p.polname
  LOOP
    IF pol.polcmd = '*' THEN cmd_clause := 'ALL';
    ELSIF pol.polcmd = 'r' THEN cmd_clause := 'SELECT';
    ELSIF pol.polcmd = 'a' THEN cmd_clause := 'INSERT';
    ELSIF pol.polcmd = 'w' THEN cmd_clause := 'UPDATE';
    ELSIF pol.polcmd = 'd' THEN cmd_clause := 'DELETE';
    ELSE cmd_clause := 'ALL';
    END IF;

    IF pol.qual_expr IS NOT NULL THEN
      using_clause := ' USING (' || pol.qual_expr || ')';
    ELSE
      using_clause := '';
    END IF;

    IF pol.check_expr IS NOT NULL THEN
      check_clause := ' WITH CHECK (' || pol.check_expr || ')';
    ELSE
      check_clause := '';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);

    sql_text := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO authenticated%s%s',
      pol.policyname,
      pol.tablename,
      pol.permissive,
      cmd_clause,
      using_clause,
      check_clause
    );

    EXECUTE sql_text;
  END LOOP;
END $$;
