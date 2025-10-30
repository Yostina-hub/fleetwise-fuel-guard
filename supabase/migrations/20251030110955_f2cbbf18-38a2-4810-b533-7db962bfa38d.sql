-- Fix the function to set search_path for security
CREATE OR REPLACE FUNCTION public.is_vehicle_online(vehicle_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.vehicle_telemetry 
    WHERE vehicle_id = vehicle_uuid 
    AND device_connected = true
    AND last_communication_at > (now() - INTERVAL '5 minutes')
    ORDER BY last_communication_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;