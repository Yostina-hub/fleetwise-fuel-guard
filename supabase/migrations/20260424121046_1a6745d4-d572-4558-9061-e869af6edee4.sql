-- 1. Schema additions
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS merged_into_request_id uuid REFERENCES public.vehicle_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_consolidated_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consolidated_request_count integer,
  ADD COLUMN IF NOT EXISTS merge_strategy text;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_merged_into
  ON public.vehicle_requests(merged_into_request_id)
  WHERE merged_into_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_is_parent
  ON public.vehicle_requests(organization_id, is_consolidated_parent)
  WHERE is_consolidated_parent = true;

-- 2. Consolidation function
CREATE OR REPLACE FUNCTION public.consolidate_vehicle_requests(
  _organization_id uuid,
  _request_ids uuid[],
  _strategy text DEFAULT 'manual',
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_authorised boolean;
  _template public.vehicle_requests%ROWTYPE;
  _new_id uuid;
  _new_number text;
  _child_count integer;
  _total_passengers integer;
  _earliest_from timestamptz;
  _latest_until timestamptz;
BEGIN
  -- Auth: must be a fleet manager / dispatcher / admin / super_admin in this org.
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _caller
      AND ur.organization_id = _organization_id
      AND ur.role::text IN ('super_admin', 'admin', 'fleet_manager', 'dispatcher', 'pool_supervisor')
  ) INTO _is_authorised;

  IF NOT _is_authorised THEN
    RAISE EXCEPTION 'Not authorised to consolidate vehicle requests';
  END IF;

  -- Validate input
  IF _request_ids IS NULL OR array_length(_request_ids, 1) IS NULL OR array_length(_request_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Need at least 2 requests to consolidate';
  END IF;

  -- Lock and validate all rows belong to this org and are eligible
  PERFORM 1
  FROM public.vehicle_requests
  WHERE id = ANY(_request_ids)
    AND organization_id = _organization_id
    AND status IN ('pending', 'approved', 'assigned')
    AND merged_into_request_id IS NULL
    AND is_consolidated_parent = false
  FOR UPDATE;

  GET DIAGNOSTICS _child_count = ROW_COUNT;

  IF _child_count <> array_length(_request_ids, 1) THEN
    RAISE EXCEPTION 'One or more requests are not eligible (wrong org, status, or already merged)';
  END IF;

  -- Pick the earliest-needed request as the template
  SELECT * INTO _template
  FROM public.vehicle_requests
  WHERE id = ANY(_request_ids)
  ORDER BY needed_from ASC
  LIMIT 1;

  -- Aggregates
  SELECT
    COALESCE(SUM(passengers), 0),
    MIN(needed_from),
    MAX(COALESCE(needed_until, needed_from))
  INTO _total_passengers, _earliest_from, _latest_until
  FROM public.vehicle_requests
  WHERE id = ANY(_request_ids);

  -- Generate parent number
  _new_number := 'VR-MRG-' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD-HH24MISS');

  -- Insert parent
  INSERT INTO public.vehicle_requests (
    organization_id, request_number, requester_id, requester_name,
    pool_location, pool_category, pool_name,
    purpose, request_type, priority,
    needed_from, needed_until,
    passengers, num_vehicles, vehicle_type, trip_type,
    departure_place, departure_lat, departure_lng,
    destination, destination_lat, destination_lng,
    contact_phone, status, approval_status,
    is_consolidated_parent, consolidated_request_count, merge_strategy,
    dispatcher_notes
  ) VALUES (
    _template.organization_id,
    _new_number,
    _caller,
    'Consolidated trip',
    _template.pool_location, _template.pool_category, _template.pool_name,
    'Consolidated: ' || COALESCE(_template.purpose, 'merged requests'),
    _template.request_type,
    _template.priority,
    _earliest_from, _latest_until,
    _total_passengers,
    GREATEST(_template.num_vehicles, 1),
    _template.vehicle_type, _template.trip_type,
    _template.departure_place, _template.departure_lat, _template.departure_lng,
    _template.destination, _template.destination_lat, _template.destination_lng,
    _template.contact_phone,
    'approved', 'approved',
    true, _child_count, _strategy,
    COALESCE(_notes, 'Auto-created by consolidation of ' || _child_count || ' requests')
  )
  RETURNING id INTO _new_id;

  -- Link children
  UPDATE public.vehicle_requests
     SET merged_into_request_id = _new_id,
         status = 'merged',
         updated_at = now()
   WHERE id = ANY(_request_ids);

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consolidate_vehicle_requests(uuid, uuid[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consolidate_vehicle_requests(uuid, uuid[], text, text) TO authenticated;