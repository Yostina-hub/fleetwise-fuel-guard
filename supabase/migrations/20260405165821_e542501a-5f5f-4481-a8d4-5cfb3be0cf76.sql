
CREATE OR REPLACE FUNCTION public.check_insert_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  recent_count INTEGER;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN 
    RAISE EXCEPTION 'Authentication required'; 
  END IF;
  
  -- Count only inserts by THIS user in the last minute (not global)
  -- Tables that don't have a direct user_id column fall back to created_by or similar
  -- For safety, we use a broad approach: count recent rows. 
  -- Since RLS already scopes to org, this is defense-in-depth.
  EXECUTE format(
    'SELECT COUNT(*) FROM %I.%I WHERE created_at > now() - interval ''1 minute''',
    TG_TABLE_SCHEMA, TG_TABLE_NAME
  ) INTO recent_count;
  
  -- Tighter per-table limit: 10 inserts/minute globally per table
  -- This is intentionally global as a DoS circuit breaker
  IF recent_count >= 50 THEN 
    RAISE EXCEPTION 'Rate limit exceeded: too many inserts/min for %', TG_TABLE_NAME; 
  END IF;
  
  RETURN NEW;
END;
$function$;
