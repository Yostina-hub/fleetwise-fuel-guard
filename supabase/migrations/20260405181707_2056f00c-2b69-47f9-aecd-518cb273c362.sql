
-- ============================================================
-- GAP 6: Fix driver_behavior_scores RLS — scope to org
-- ============================================================
DROP POLICY IF EXISTS "Users can view driver behavior scores" ON public.driver_behavior_scores;
CREATE POLICY "Users can view org driver behavior scores"
  ON public.driver_behavior_scores FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- ============================================================
-- GAP 7: Fix email_report_configs RLS — scope to org
-- ============================================================
DROP POLICY IF EXISTS "Users can view email report configs" ON public.email_report_configs;
CREATE POLICY "Users can view org email report configs"
  ON public.email_report_configs FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- ============================================================
-- GAP 8: Restrict organization_settings SELECT to admins only
-- (secrets like smtp_password, vapid_private_key exposed to all members)
-- ============================================================
DROP POLICY IF EXISTS "Organization members can view settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can view organization settings" ON public.organization_settings;
CREATE POLICY "Admins can view organization settings"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (
    (
      organization_id = get_user_organization(auth.uid())
      AND (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
      )
    )
    OR is_super_admin(auth.uid())
  );

-- ============================================================
-- GAP 10: Fix check_insert_rate_limit to be per-user scoped
-- ============================================================
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
  
  -- Determine which column tracks the user on this table
  -- Try common patterns: created_by, user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'created_by'
  ) THEN
    user_column := 'created_by';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'user_id'
  ) THEN
    user_column := 'user_id';
  ELSE
    user_column := NULL;
  END IF;
  
  IF user_column IS NOT NULL THEN
    -- Per-user rate limit: 10 inserts/minute per user per table
    EXECUTE format(
      'SELECT COUNT(*) FROM %I.%I WHERE created_at > now() - interval ''1 minute'' AND %I = $1',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, user_column
    ) INTO recent_count USING current_user_id;
    
    IF recent_count >= 10 THEN 
      RAISE EXCEPTION 'Rate limit exceeded: too many inserts/min for % by user', TG_TABLE_NAME; 
    END IF;
  ELSE
    -- Fallback: global circuit breaker (50/min) for tables without user column
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
