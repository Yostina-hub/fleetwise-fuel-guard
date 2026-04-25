
-- Tier-2 proximity sweep: rides that pass through the requester's pickup
-- 1) Per-pool corridor tolerance (km)
ALTER TABLE public.fleet_pools
  ADD COLUMN IF NOT EXISTS corridor_km numeric NOT NULL DEFAULT 3.0;

COMMENT ON COLUMN public.fleet_pools.corridor_km IS
  'Max detour radius (km) from a ride''s route to consider an extra passenger pickup as a "passing-through" match. Used by find_proximity_match_rides.';

-- 2) Polyline-ready schema: nullable line geometry on shared_rides
-- For now, populated as a straight line origin -> destination via trigger;
-- later this column can be filled with real encoded route polylines.
ALTER TABLE public.shared_rides
  ADD COLUMN IF NOT EXISTS route_geom geography(LineString, 4326);

CREATE INDEX IF NOT EXISTS idx_shared_rides_route_geom
  ON public.shared_rides USING gist (route_geom);

-- Trigger to auto-derive route_geom = straight line between origin/destination
CREATE OR REPLACE FUNCTION public.shared_rides_set_route_geom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.origin_geom IS NOT NULL AND NEW.destination_geom IS NOT NULL THEN
    -- Use ST_MakeLine on the underlying geometries, then cast back to geography
    NEW.route_geom := ST_MakeLine(
      NEW.origin_geom::geometry,
      NEW.destination_geom::geometry
    )::geography;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shared_rides_set_route_geom ON public.shared_rides;
CREATE TRIGGER trg_shared_rides_set_route_geom
  BEFORE INSERT OR UPDATE OF origin_geom, destination_geom
  ON public.shared_rides
  FOR EACH ROW
  EXECUTE FUNCTION public.shared_rides_set_route_geom();

-- Backfill existing rows
UPDATE public.shared_rides
SET route_geom = ST_MakeLine(origin_geom::geometry, destination_geom::geometry)::geography
WHERE route_geom IS NULL
  AND origin_geom IS NOT NULL
  AND destination_geom IS NOT NULL;

-- 3) Tier-2 RPC: rides whose corridor passes near requester's pickup,
--    and whose destination is reasonably toward the requester's drop-off.
CREATE OR REPLACE FUNCTION public.find_proximity_match_rides(
  _organization_id uuid,
  _pool_code text,
  _origin_lat double precision,
  _origin_lng double precision,
  _destination_lat double precision,
  _destination_lng double precision,
  _departure_at timestamptz,
  _seats_needed integer DEFAULT 1,
  _wait_window_min integer DEFAULT 10,
  _destination_radius_km numeric DEFAULT 5.0
)
RETURNS TABLE (
  ride_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  pool_code text,
  origin_label text,
  destination_label text,
  departure_at timestamptz,
  available_seats integer,
  total_seats integer,
  origin_lat double precision,
  origin_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  detour_km double precision,
  destination_distance_km double precision,
  time_delta_minutes double precision,
  corridor_km_used numeric,
  match_score double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _origin_point geography := ST_SetSRID(ST_MakePoint(_origin_lng, _origin_lat), 4326)::geography;
  _dest_point   geography := ST_SetSRID(ST_MakePoint(_destination_lng, _destination_lat), 4326)::geography;
  _corridor_m  double precision;
BEGIN
  -- Resolve corridor from pool setting (fallback 3 km)
  SELECT (COALESCE(fp.corridor_km, 3.0) * 1000.0)::double precision
    INTO _corridor_m
  FROM public.fleet_pools fp
  WHERE fp.organization_id = _organization_id
    AND fp.code = _pool_code
  LIMIT 1;
  IF _corridor_m IS NULL THEN
    _corridor_m := 3000.0;
  END IF;

  RETURN QUERY
  SELECT
    r.id                                              AS ride_id,
    r.vehicle_id,
    r.driver_id,
    r.pool_code,
    r.origin_label,
    r.destination_label,
    r.departure_at,
    r.available_seats,
    r.total_seats,
    ST_Y(r.origin_geom::geometry)                     AS origin_lat,
    ST_X(r.origin_geom::geometry)                     AS origin_lng,
    ST_Y(r.destination_geom::geometry)                AS destination_lat,
    ST_X(r.destination_geom::geometry)                AS destination_lng,
    (ST_Distance(r.route_geom, _origin_point) / 1000.0)::double precision AS detour_km,
    (ST_Distance(r.destination_geom, _dest_point) / 1000.0)::double precision AS destination_distance_km,
    (EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0)::double precision AS time_delta_minutes,
    (_corridor_m / 1000.0)::numeric                   AS corridor_km_used,
    -- Composite score: lower detour + lower time delta + reasonable destination = higher score
    (
      100.0
      - (ST_Distance(r.route_geom, _origin_point) / GREATEST(_corridor_m, 1))::double precision * 30.0
      - LEAST(ABS(EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0), 30) * 1.5
      - LEAST(ST_Distance(r.destination_geom, _dest_point) / 1000.0, 10) * 2.0
    )::double precision                                AS match_score
  FROM public.shared_rides r
  WHERE r.organization_id = _organization_id
    AND r.status IN ('planned','boarding')
    AND r.available_seats >= _seats_needed
    AND r.route_geom IS NOT NULL
    AND r.departure_at BETWEEN
        _departure_at - make_interval(mins => _wait_window_min)
        AND _departure_at + make_interval(mins => _wait_window_min)
    -- Tier-2 corridor check: ride route passes close to requester pickup
    AND ST_DWithin(r.route_geom, _origin_point, _corridor_m)
    -- Destination must be roughly toward requester's drop-off
    AND ST_DWithin(r.destination_geom, _dest_point, (_destination_radius_km * 1000.0))
    -- Exclude rides that already match Tier-1 (origin within 2km)
    AND ST_Distance(r.origin_geom, _origin_point) > 2000.0
    -- Pool gate (same pool or any if not specified)
    AND (_pool_code IS NULL OR r.pool_code = _pool_code)
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$;

REVOKE ALL ON FUNCTION public.find_proximity_match_rides(uuid, text, double precision, double precision, double precision, double precision, timestamptz, integer, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_proximity_match_rides(uuid, text, double precision, double precision, double precision, double precision, timestamptz, integer, integer, numeric) TO authenticated;
