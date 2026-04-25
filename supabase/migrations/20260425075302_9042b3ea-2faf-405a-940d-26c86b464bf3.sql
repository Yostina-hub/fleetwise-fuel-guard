CREATE OR REPLACE VIEW public.latest_vehicle_telemetry
WITH (security_invoker=on) AS
SELECT DISTINCT ON (vehicle_id) *
FROM public.vehicle_telemetry
ORDER BY vehicle_id, last_communication_at DESC;