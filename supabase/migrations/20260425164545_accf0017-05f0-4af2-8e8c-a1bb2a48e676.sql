
-- =========================================================
-- 1. PostGIS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================================================
-- 2. shared_rides — the "Uber" ride
-- =========================================================
CREATE TABLE IF NOT EXISTS public.shared_rides (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pool_code           text,                 -- origin pool (matches vehicle_requests.pool_name)
  vehicle_id          uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id           uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  origin_label        text NOT NULL,
  origin_lat          double precision NOT NULL,
  origin_lng          double precision NOT NULL,
  origin_geom         geography(Point, 4326),
  destination_label   text NOT NULL,
  destination_lat     double precision NOT NULL,
  destination_lng     double precision NOT NULL,
  destination_geom    geography(Point, 4326),
  /**
   * route_path: optional encoded polyline OR GeoJSON LineString — populated
   * later when Google/OpenRouteService geocoding lands. Kept text for now so
   * Phase 1 isn't blocked on a routing provider.
   */
  route_path          text,
  departure_at        timestamptz NOT NULL,
  /**
   * flexibility_buffer_min: how many minutes earlier/later the ride can leave
   * relative to `departure_at`. Default 10 per the SOP "Wait Window".
   */
  flexibility_buffer_min integer NOT NULL DEFAULT 10 CHECK (flexibility_buffer_min BETWEEN 0 AND 60),
  total_seats         integer NOT NULL CHECK (total_seats > 0),
  /**
   * available_seats is auto-maintained by the passenger trigger below, but
   * stored as a column so PostgREST can filter on it cheaply (vs an aggregate).
   */
  available_seats     integer NOT NULL,
  status              text NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned','boarding','in_progress','completed','cancelled')),
  cross_pool_allowed  boolean NOT NULL DEFAULT false,
  notes               text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (available_seats >= 0 AND available_seats <= total_seats)
);

CREATE INDEX IF NOT EXISTS idx_shared_rides_org_dep
  ON public.shared_rides (organization_id, departure_at);
CREATE INDEX IF NOT EXISTS idx_shared_rides_pool_status
  ON public.shared_rides (organization_id, pool_code, status);
CREATE INDEX IF NOT EXISTS idx_shared_rides_origin_geom
  ON public.shared_rides USING GIST (origin_geom);
CREATE INDEX IF NOT EXISTS idx_shared_rides_destination_geom
  ON public.shared_rides USING GIST (destination_geom);
CREATE INDEX IF NOT EXISTS idx_shared_rides_driver_active
  ON public.shared_rides (driver_id) WHERE status IN ('planned','boarding','in_progress');

-- Auto-populate geography columns from lat/lng
CREATE OR REPLACE FUNCTION public.shared_rides_set_geoms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.origin_geom := ST_SetSRID(ST_MakePoint(NEW.origin_lng, NEW.origin_lat), 4326)::geography;
  NEW.destination_geom := ST_SetSRID(ST_MakePoint(NEW.destination_lng, NEW.destination_lat), 4326)::geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shared_rides_set_geoms ON public.shared_rides;
CREATE TRIGGER trg_shared_rides_set_geoms
  BEFORE INSERT OR UPDATE OF origin_lat, origin_lng, destination_lat, destination_lng
  ON public.shared_rides
  FOR EACH ROW EXECUTE FUNCTION public.shared_rides_set_geoms();

-- =========================================================
-- 3. shared_ride_passengers — links rides to vehicle_requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.shared_ride_passengers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_ride_id     uuid NOT NULL REFERENCES public.shared_rides(id) ON DELETE CASCADE,
  vehicle_request_id uuid NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id    uuid NOT NULL,
  passenger_user_id  uuid,                    -- who's actually riding (denormalized for fast lookups)
  pickup_label       text,
  pickup_lat         double precision,
  pickup_lng         double precision,
  pickup_geom        geography(Point, 4326),
  dropoff_label      text,
  dropoff_lat        double precision,
  dropoff_lng        double precision,
  seats              integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  status             text NOT NULL DEFAULT 'reserved'
                      CHECK (status IN ('reserved','boarded','dropped_off','no_show','cancelled')),
  reserved_at        timestamptz NOT NULL DEFAULT now(),
  boarded_at         timestamptz,
  dropped_off_at     timestamptz,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shared_ride_id, vehicle_request_id)
);

CREATE INDEX IF NOT EXISTS idx_srp_ride
  ON public.shared_ride_passengers (shared_ride_id);
CREATE INDEX IF NOT EXISTS idx_srp_request
  ON public.shared_ride_passengers (vehicle_request_id);
CREATE INDEX IF NOT EXISTS idx_srp_user
  ON public.shared_ride_passengers (passenger_user_id);

CREATE OR REPLACE FUNCTION public.shared_ride_passengers_set_geom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL THEN
    NEW.pickup_geom := ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_srp_set_geom ON public.shared_ride_passengers;
CREATE TRIGGER trg_srp_set_geom
  BEFORE INSERT OR UPDATE OF pickup_lat, pickup_lng
  ON public.shared_ride_passengers
  FOR EACH ROW EXECUTE FUNCTION public.shared_ride_passengers_set_geom();

-- =========================================================
-- 4. Auto-maintain shared_rides.available_seats
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalc_shared_ride_seats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ride_id uuid := COALESCE(NEW.shared_ride_id, OLD.shared_ride_id);
  v_taken   integer;
  v_total   integer;
BEGIN
  SELECT COALESCE(SUM(seats), 0)
    INTO v_taken
  FROM public.shared_ride_passengers
  WHERE shared_ride_id = v_ride_id
    AND status NOT IN ('cancelled','no_show');

  SELECT total_seats INTO v_total FROM public.shared_rides WHERE id = v_ride_id;
  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.shared_rides
     SET available_seats = GREATEST(v_total - v_taken, 0),
         updated_at = now()
   WHERE id = v_ride_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_srp_recalc_seats ON public.shared_ride_passengers;
CREATE TRIGGER trg_srp_recalc_seats
  AFTER INSERT OR UPDATE OF seats, status OR DELETE
  ON public.shared_ride_passengers
  FOR EACH ROW EXECUTE FUNCTION public.recalc_shared_ride_seats();

-- =========================================================
-- 5. RLS
-- =========================================================
ALTER TABLE public.shared_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_ride_passengers ENABLE ROW LEVEL SECURITY;

-- Helper used in policies — true if user belongs to ride's pool OR has org-wide reach
CREATE OR REPLACE FUNCTION public.can_see_shared_ride(_ride_org uuid, _pool_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- same org first
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = _ride_org)
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'fleet_owner')
      OR public.has_role(auth.uid(), 'fleet_manager')
      OR public.has_role(auth.uid(), 'operations_manager')
      OR public.has_role(auth.uid(), 'dispatcher')
      OR public.has_role(auth.uid(), 'auditor')
      OR _pool_code IS NULL
      OR public.user_belongs_to_pool(auth.uid(), _pool_code)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_shared_ride(_ride_org uuid, _pool_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = _ride_org)
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'fleet_owner')
      OR public.has_role(auth.uid(), 'fleet_manager')
      OR public.has_role(auth.uid(), 'operations_manager')
      OR public.has_role(auth.uid(), 'dispatcher')
      OR public.has_role(auth.uid(), 'operator')
      OR (_pool_code IS NOT NULL AND public.is_pool_manager(auth.uid(), _pool_code))
    );
$$;

CREATE POLICY "shared_rides_select"
  ON public.shared_rides FOR SELECT
  TO authenticated
  USING (public.can_see_shared_ride(organization_id, pool_code));

CREATE POLICY "shared_rides_write"
  ON public.shared_rides FOR ALL
  TO authenticated
  USING (public.can_manage_shared_ride(organization_id, pool_code))
  WITH CHECK (public.can_manage_shared_ride(organization_id, pool_code));

CREATE POLICY "shared_ride_passengers_select"
  ON public.shared_ride_passengers FOR SELECT
  TO authenticated
  USING (
    -- See if you can see the ride
    EXISTS (
      SELECT 1 FROM public.shared_rides r
      WHERE r.id = shared_ride_id
        AND public.can_see_shared_ride(r.organization_id, r.pool_code)
    )
    -- OR you own the underlying request
    OR EXISTS (
      SELECT 1 FROM public.vehicle_requests vr
      WHERE vr.id = vehicle_request_id
        AND vr.requester_id = auth.uid()
    )
    OR passenger_user_id = auth.uid()
  );

CREATE POLICY "shared_ride_passengers_write_managers"
  ON public.shared_ride_passengers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_rides r
      WHERE r.id = shared_ride_id
        AND public.can_manage_shared_ride(r.organization_id, r.pool_code)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_rides r
      WHERE r.id = shared_ride_id
        AND public.can_manage_shared_ride(r.organization_id, r.pool_code)
    )
  );

-- Passengers can self-join an open ride for their own request (insert only)
CREATE POLICY "shared_ride_passengers_self_join"
  ON public.shared_ride_passengers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicle_requests vr
      WHERE vr.id = vehicle_request_id
        AND vr.requester_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.shared_rides r
      WHERE r.id = shared_ride_id
        AND r.status IN ('planned','boarding')
        AND r.available_seats >= seats
        AND public.can_see_shared_ride(r.organization_id, r.pool_code)
    )
  );

-- =========================================================
-- 6. Direct-match function (Tier 1)
-- =========================================================
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
    ST_Distance(r.origin_geom, (SELECT g FROM origin)) / 1000.0    AS origin_distance_km,
    ST_Distance(r.destination_geom, (SELECT g FROM dest)) / 1000.0 AS destination_distance_km,
    EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0    AS time_delta_minutes,
    /**
     * Match score: lower is better.
     *   0.5 * origin_km + 0.5 * dest_km + 0.1 * |minutes_diff|
     * Origin & destination weighted equally, time penalty light so a closer
     * pickup beats a slightly closer departure-time match.
     */
    (0.5 * (ST_Distance(r.origin_geom,      (SELECT g FROM origin)) / 1000.0)
   + 0.5 * (ST_Distance(r.destination_geom, (SELECT g FROM dest))   / 1000.0)
   + 0.1 * ABS(EXTRACT(EPOCH FROM (r.departure_at - _departure_at)) / 60.0)
    ) AS match_score
  FROM public.shared_rides r
  WHERE r.organization_id = _organization_id
    AND r.status IN ('planned','boarding')
    AND r.available_seats >= _seats_needed
    -- Pool boundary: same pool OR cross-pool flag set
    AND (r.pool_code = _pool_code OR r.cross_pool_allowed = true OR _pool_code IS NULL)
    -- Wait window: ride leaves within ±(buffer + wait_window) of requested time
    AND r.departure_at BETWEEN _departure_at - make_interval(mins => GREATEST(_wait_window_min, r.flexibility_buffer_min))
                           AND _departure_at + make_interval(mins => GREATEST(_wait_window_min, r.flexibility_buffer_min))
    -- Origin within radius
    AND ST_DWithin(r.origin_geom, (SELECT g FROM origin), _origin_radius_km * 1000.0)
    -- Destination within radius
    AND ST_DWithin(r.destination_geom, (SELECT g FROM dest), _destination_radius_km * 1000.0)
  ORDER BY match_score ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.find_direct_match_rides(
  uuid, text, double precision, double precision, double precision, double precision,
  timestamptz, integer, double precision, double precision, integer
) TO authenticated;
