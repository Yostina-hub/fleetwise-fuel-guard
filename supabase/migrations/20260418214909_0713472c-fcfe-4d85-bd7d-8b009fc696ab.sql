-- 1) Allow trusted server/service-role context to bypass per-user rate limit.
-- Regular authenticated users are still rate-limited (10/min/user, 50/min/table).
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
  -- Service role / trusted server context (no JWT): bypass rate limit.
  IF current_user_id IS NULL THEN
    RETURN NEW;
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

-- 2) Backfill the stuck fuel request (all approvals are done but request stayed pending)
UPDATE public.fuel_requests
SET status = 'approved',
    approved_at = COALESCE(approved_at, now()),
    liters_approved = COALESCE(liters_approved, liters_requested)
WHERE id = '42afc3d9-126a-4eba-9adf-f5694edb12f7'
  AND status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.fuel_request_approvals
    WHERE fuel_request_id = '42afc3d9-126a-4eba-9adf-f5694edb12f7'
      AND action = 'pending'
  );

-- 3) Safety: auto-finalize fuel_requests when all approvals are decided.
CREATE OR REPLACE FUNCTION public.fuel_request_auto_finalize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count int;
  v_rejected_count int;
  v_request RECORD;
BEGIN
  IF NEW.action = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_request FROM public.fuel_requests WHERE id = NEW.fuel_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) FILTER (WHERE action = 'pending'),
         COUNT(*) FILTER (WHERE action = 'reject')
    INTO v_pending_count, v_rejected_count
  FROM public.fuel_request_approvals
  WHERE fuel_request_id = NEW.fuel_request_id;

  IF v_rejected_count > 0 THEN
    UPDATE public.fuel_requests
       SET status = 'rejected',
           approved_by = NEW.approver_id,
           approved_at = COALESCE(NEW.acted_at, now()),
           rejected_reason = COALESCE(NEW.comment, rejected_reason)
     WHERE id = NEW.fuel_request_id AND status = 'pending';
  ELSIF v_pending_count = 0 THEN
    UPDATE public.fuel_requests
       SET status = 'approved',
           approved_by = NEW.approver_id,
           approved_at = COALESCE(NEW.acted_at, now()),
           liters_approved = COALESCE(liters_approved, liters_requested),
           rejected_reason = NULL
     WHERE id = NEW.fuel_request_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fuel_request_auto_finalize ON public.fuel_request_approvals;
CREATE TRIGGER trg_fuel_request_auto_finalize
AFTER UPDATE OF action ON public.fuel_request_approvals
FOR EACH ROW
WHEN (NEW.action <> 'pending')
EXECUTE FUNCTION public.fuel_request_auto_finalize();