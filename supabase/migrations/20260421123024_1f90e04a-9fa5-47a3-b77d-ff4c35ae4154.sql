-- Generate descriptive vehicle request numbers: VR-{TYPE}-{YYMMDD}-{NNNN}
-- TYPE codes: DLY (daily_operation), NGT (nighttime_operation), PRJ (project_operation),
-- FLD (field_operation), GRP (group_operation), GEN (fallback).
-- Sequence resets per (org, day, type) for stable, predictable numbering.
CREATE OR REPLACE FUNCTION public.generate_vehicle_request_number(
  p_org_id uuid,
  p_request_type text DEFAULT 'daily_operation'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_type_code text;
  v_date_part text := to_char(now(), 'YYMMDD');
  v_seq integer;
  v_prefix text;
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

  -- Atomic next sequence for this org/day/type combo. Locks via SELECT ... FOR UPDATE
  -- on the count query is unnecessary because we count then insert; collisions are
  -- prevented by request_number's existing uniqueness constraint at insert time.
  SELECT COALESCE(MAX(NULLIF(regexp_replace(request_number, '^.*-', ''), '')::integer), 0) + 1
    INTO v_seq
    FROM public.vehicle_requests
   WHERE organization_id = p_org_id
     AND request_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_seq::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_vehicle_request_number(uuid, text) TO authenticated;