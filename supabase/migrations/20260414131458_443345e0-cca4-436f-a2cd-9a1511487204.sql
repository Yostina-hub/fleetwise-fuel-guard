
-- 1. PARTITIONED TIME-SERIES EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'gps',
  event_time timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lat double precision,
  lng double precision,
  speed_kmh double precision,
  heading double precision,
  source text DEFAULT 'device',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telemetry_events_pkey PRIMARY KEY (id, event_time),
  CONSTRAINT telemetry_events_event_id_time_uq UNIQUE (event_id, event_time)
) PARTITION BY RANGE (event_time);

-- Create 24 monthly partitions
DO $body$
DECLARE
  sd date; ed date; pname text;
BEGIN
  FOR y IN 2025..2026 LOOP
    FOR m IN 1..12 LOOP
      sd := make_date(y, m, 1);
      ed := sd + interval '1 month';
      pname := 'telemetry_events_' || to_char(sd, 'YYYY_MM');
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
        EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.telemetry_events FOR VALUES FROM (%L) TO (%L)', pname, sd, ed);
      END IF;
    END LOOP;
  END LOOP;
END $body$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_te_vehicle_time ON public.telemetry_events (vehicle_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_te_device_time ON public.telemetry_events (device_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_te_org_type_time ON public.telemetry_events (organization_id, event_type, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_te_payload ON public.telemetry_events USING gin (payload);

-- 2. MATERIALIZED VIEWS
CREATE MATERIALIZED VIEW IF NOT EXISTS public.telemetry_hourly_agg AS
SELECT
  organization_id, vehicle_id, event_type,
  date_trunc('hour', event_time) AS bucket,
  count(*) AS event_count,
  avg(speed_kmh) AS avg_speed, max(speed_kmh) AS max_speed,
  avg((payload->>'fuel_level')::double precision) AS avg_fuel,
  min((payload->>'fuel_level')::double precision) AS min_fuel,
  max((payload->>'fuel_level')::double precision) AS max_fuel,
  max((payload->>'odometer_km')::double precision) - min((payload->>'odometer_km')::double precision) AS distance_km,
  count(*) FILTER (WHERE (payload->>'is_alarm')::boolean = true) AS alarm_count
FROM public.telemetry_events
GROUP BY organization_id, vehicle_id, event_type, date_trunc('hour', event_time)
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_agg_pk ON public.telemetry_hourly_agg (organization_id, vehicle_id, event_type, bucket);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.telemetry_daily_agg AS
SELECT
  organization_id, vehicle_id, event_type,
  date_trunc('day', event_time) AS bucket,
  count(*) AS event_count,
  avg(speed_kmh) AS avg_speed, max(speed_kmh) AS max_speed,
  avg((payload->>'fuel_level')::double precision) AS avg_fuel,
  min((payload->>'fuel_level')::double precision) AS min_fuel,
  max((payload->>'fuel_level')::double precision) AS max_fuel,
  max((payload->>'odometer_km')::double precision) - min((payload->>'odometer_km')::double precision) AS distance_km,
  count(*) FILTER (WHERE (payload->>'is_alarm')::boolean = true) AS alarm_count
FROM public.telemetry_events
GROUP BY organization_id, vehicle_id, event_type, date_trunc('day', event_time)
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_agg_pk ON public.telemetry_daily_agg (organization_id, vehicle_id, event_type, bucket);

-- 3. PARTITION MANAGEMENT
CREATE OR REPLACE FUNCTION public.create_telemetry_partition(p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sd date; ed date; pname text;
BEGIN
  sd := date_trunc('month', p_date)::date;
  ed := (sd + interval '1 month')::date;
  pname := 'telemetry_events_' || to_char(sd, 'YYYY_MM');
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.telemetry_events FOR VALUES FROM (%L) TO (%L)', pname, sd, ed);
  END IF;
END;
$$;

-- 4. RETENTION CLEANUP
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry(p_retain_months int DEFAULT 6)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cutoff_date date;
  partition_rec record;
  dropped_count int := 0;
  from_str text;
  from_date date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Insufficient privileges'; END IF;

  cutoff_date := (date_trunc('month', now()) - (p_retain_months || ' months')::interval)::date;

  FOR partition_rec IN
    SELECT c.relname AS partition_name
    FROM pg_inherits JOIN pg_class c ON c.oid = inhrelid
    WHERE inhparent = 'public.telemetry_events'::regclass
    ORDER BY c.relname
  LOOP
    -- Extract YYYY_MM from name like telemetry_events_2025_01
    from_str := substring(partition_rec.partition_name from 'telemetry_events_(\d{4}_\d{2})');
    IF from_str IS NOT NULL THEN
      BEGIN
        from_date := to_date(from_str, 'YYYY_MM');
        IF from_date < cutoff_date THEN
          EXECUTE format('DROP TABLE IF EXISTS public.%I', partition_rec.partition_name);
          dropped_count := dropped_count + 1;
        END IF;
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
  END LOOP;

  RETURN format('Dropped %s partitions older than %s', dropped_count, cutoff_date);
END;
$$;

-- 5. AGGREGATE REFRESH
CREATE OR REPLACE FUNCTION public.refresh_telemetry_aggregates()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.telemetry_hourly_agg;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.telemetry_daily_agg;
END;
$$;

-- 6. RLS
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view telemetry events"
  ON public.telemetry_events FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE POLICY "Org members can insert telemetry events"
  ON public.telemetry_events FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));

-- 7. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_events;
