-- Enforce uniqueness on vehicle_requests.request_number per organization.
-- Scoped to organization_id so two tenants can never collide, and partial
-- (WHERE request_number IS NOT NULL) so legacy rows without a number aren't
-- blocked. The generator RPC already uses the same scope when computing the
-- next sequence number, so this aligns the DB invariant with the app logic.
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_requests_org_request_number_uq
  ON public.vehicle_requests (organization_id, request_number)
  WHERE request_number IS NOT NULL;

-- Harden the generator: take an advisory lock per (org, type, day) so two
-- concurrent inserts can't both compute the same sequence number and crash on
-- the new unique index. The lock auto-releases at transaction end.
CREATE OR REPLACE FUNCTION public.generate_vehicle_request_number(
  p_org_id uuid,
  p_request_type text DEFAULT 'daily_operation'::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type_code text;
  v_date_part text := to_char(now(), 'YYMMDD');
  v_seq integer;
  v_prefix text;
  v_candidate text;
  v_lock_key bigint;
BEGIN
  v_type_code := CASE p_request_type
    WHEN 'daily_operation'      THEN 'DLY'
    WHEN 'nighttime_operation'  THEN 'NGT'
    WHEN 'project_operation'    THEN 'PRJ'
    WHEN 'field_operation'      THEN 'FLD'
    WHEN 'group_operation'      THEN 'GRP'
    ELSE 'GEN'
  END;

  v_prefix := 'VR-' || v_type_code || '-' || v_date_part || '-';

  -- Serialize concurrent generators for the same org/type/day so two callers
  -- can't both pick the same MAX()+1 and collide on insert.
  v_lock_key := hashtextextended(p_org_id::text || '|' || v_type_code || '|' || v_date_part, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(NULLIF(regexp_replace(request_number, '^.*-', ''), '')::integer), 0) + 1
    INTO v_seq
    FROM public.vehicle_requests
   WHERE organization_id = p_org_id
     AND request_number LIKE v_prefix || '%';

  v_candidate := v_prefix || lpad(v_seq::text, 4, '0');

  -- Defensive double-check: if a row with this number somehow exists (e.g.
  -- imported manually), step forward until we find a free slot.
  WHILE EXISTS (
    SELECT 1 FROM public.vehicle_requests
     WHERE organization_id = p_org_id
       AND request_number = v_candidate
  ) LOOP
    v_seq := v_seq + 1;
    v_candidate := v_prefix || lpad(v_seq::text, 4, '0');
  END LOOP;

  RETURN v_candidate;
END;
$function$;