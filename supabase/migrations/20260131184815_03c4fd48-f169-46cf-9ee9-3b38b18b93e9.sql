CREATE OR REPLACE FUNCTION public.get_vehicle_fuel_status(p_vehicle_ids uuid[])
RETURNS TABLE (
  vehicle_id uuid,
  last_fuel_reading numeric,
  last_communication_at timestamptz,
  fuel_records_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (vt.vehicle_id)
      vt.vehicle_id,
      vt.fuel_level_percent::numeric AS last_fuel_reading,
      vt.last_communication_at
    FROM public.vehicle_telemetry vt
    WHERE vt.vehicle_id = ANY(p_vehicle_ids)
      AND vt.fuel_level_percent IS NOT NULL
    ORDER BY vt.vehicle_id, vt.last_communication_at DESC
  ),
  counts AS (
    SELECT vt.vehicle_id, COUNT(*)::bigint AS fuel_records_count
    FROM public.vehicle_telemetry vt
    WHERE vt.vehicle_id = ANY(p_vehicle_ids)
      AND vt.fuel_level_percent IS NOT NULL
    GROUP BY vt.vehicle_id
  )
  SELECT c.vehicle_id, l.last_fuel_reading, l.last_communication_at, c.fuel_records_count
  FROM counts c
  JOIN latest l ON l.vehicle_id = c.vehicle_id;
$$;