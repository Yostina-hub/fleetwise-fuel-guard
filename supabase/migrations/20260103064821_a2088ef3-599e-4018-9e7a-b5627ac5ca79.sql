-- Create function to update driver stats when trips are completed
CREATE OR REPLACE FUNCTION public.update_driver_trip_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when trip has a driver_id and is being completed
  IF NEW.driver_id IS NOT NULL AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update driver's total_trips and total_distance_km
    UPDATE public.drivers
    SET 
      total_trips = COALESCE(total_trips, 0) + 1,
      total_distance_km = COALESCE(total_distance_km, 0) + COALESCE(NEW.distance_km, 0),
      updated_at = now()
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for trip completion
DROP TRIGGER IF EXISTS update_driver_stats_on_trip_complete ON public.trips;
CREATE TRIGGER update_driver_stats_on_trip_complete
  AFTER INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_trip_stats();

-- Also create a function to recalculate driver stats from existing trips (can be called manually)
CREATE OR REPLACE FUNCTION public.recalculate_driver_stats(p_organization_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Update all drivers' stats based on their completed trips
  UPDATE public.drivers d
  SET 
    total_trips = COALESCE(stats.trip_count, 0),
    total_distance_km = COALESCE(stats.total_km, 0),
    updated_at = now()
  FROM (
    SELECT 
      driver_id,
      COUNT(*) as trip_count,
      COALESCE(SUM(distance_km), 0) as total_km
    FROM public.trips
    WHERE status = 'completed' 
      AND driver_id IS NOT NULL
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    GROUP BY driver_id
  ) stats
  WHERE d.id = stats.driver_id
    AND (p_organization_id IS NULL OR d.organization_id = p_organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;