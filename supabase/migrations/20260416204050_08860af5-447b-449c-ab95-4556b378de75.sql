CREATE OR REPLACE FUNCTION public.check_insert_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  recent_count INTEGER;
  current_user_id UUID;
  user_column TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN 
    RAISE EXCEPTION 'Authentication required'; 
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'created_by'
  ) THEN
    user_column := 'created_by';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'user_id'
  ) THEN
    user_column := 'user_id';
  ELSE
    user_column := NULL;
  END IF;
  
  IF user_column IS NOT NULL THEN
    -- Cast both sides to text so this works whether the user column is uuid or text
    EXECUTE format(
      'SELECT COUNT(*) FROM %I.%I WHERE created_at > now() - interval ''1 minute'' AND %I::text = $1::text',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, user_column
    ) INTO recent_count USING current_user_id;
    
    IF recent_count >= 10 THEN 
      RAISE EXCEPTION 'Rate limit exceeded: too many inserts/min for % by user', TG_TABLE_NAME; 
    END IF;
  ELSE
    EXECUTE format(
      'SELECT COUNT(*) FROM %I.%I WHERE created_at > now() - interval ''1 minute''',
      TG_TABLE_SCHEMA, TG_TABLE_NAME
    ) INTO recent_count;
    
    IF recent_count >= 50 THEN 
      RAISE EXCEPTION 'Rate limit exceeded: too many inserts/min for %', TG_TABLE_NAME; 
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;