DROP FUNCTION IF EXISTS public.find_direct_match_rides(
  uuid, text, double precision, double precision, double precision, double precision,
  timestamptz, integer, double precision, double precision, integer
);

CREATE OR REPLACE FUNCTION public.find_direct_match_rides(
  _organization_id uuid,
  _pool_code text,
  _origin_lat double precision,
  _origin_lng double precision,
  _destination_lat double precision,
  _destination_lng double precision,
  _departure_at timestamptz,
  _seats_needed integer DEFAULT 1,
  _origin_radius_km double precision DEFAULT 2.0,
  _destination_radius_km double precision DEFAULT 2.0,
  _wait_window_min integer DEFAULT 10
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
  origin_distance_km double precision,
  destination_distance_km double precision,
  time_delta_minutes double precision,
  match_score double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(_origin_lng, _origin_lat), 4326)::geography AS g
  ),
  dest AS (
    SELECT ST_SetSRID(ST_MakePoint(_destination_lng, _destination_lat), 4326)::geography AS g
  )
  SELECT
    r.id,
    r.vehicle_id,
    r.driver_id,
    r.pool_code,
    r.origin_label,
    r.destination_label,
    r.departure_at,
    r.available_seats,
    r.total_seats,
    r.origin_lat,
    r.origin_lng,
    r.destination_lat,
    r.destination_lng,
    ST_Distance(r.origin_geom, (SELECT g FROM origin)) / 1000.0    AS origin_distance_km,
    ST_Distance(r.destination_geom, (SELECT g FROM dest)) / 1000.0 AS destination_distance_km,
    EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0    AS time_delta_minutes,
    (0.5 * (ST_Distance(r.origin_geom,      (SELECT g FROM origin)) / 1000.0)
   + 0.5 * (ST_Distance(r.destination_geom, (SELECT g FROM dest))   / 1000.0)
   + 0.1 * ABS(EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0)
    ) AS match_score
  FROM public.shared_rides r
  WHERE r.organization_id = _organization_id
    AND r.status IN ('planned','boarding')
    AND r.available_seats >= _seats_needed
    AND (r.pool_code = _pool_code OR r.cross_pool_allowed = true OR _pool_code IS NULL)
    AND r.departure_at BETWEEN _departure_at - make_interval(mins => GREATEST(_wait_window_min, r.flexibility_buffer_min))
                           AND _departure_at + make_interval(mins => GREATEST(_wait_window_min, r.flexibility_buffer_min))
    AND ST_DWithin(r.origin_geom, (SELECT g FROM origin), _origin_radius_km * 1000.0)
    AND ST_DWithin(r.destination_geom, (SELECT g FROM dest), _destination_radius_km * 1000.0)
  ORDER BY match_score ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.find_direct_match_rides(
  uuid, text, double precision, double precision, double precision, double precision,
  timestamptz, integer, double precision, double precision, integer
) TO authenticated;