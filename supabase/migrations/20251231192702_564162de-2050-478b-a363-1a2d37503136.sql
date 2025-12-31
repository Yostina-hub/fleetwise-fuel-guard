-- Add vehicle_type and assigned_driver_id columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type text,
ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES public.drivers(id);

-- Create index for driver lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON public.vehicles(assigned_driver_id);

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.vehicle_type IS 'Type of vehicle: truck, automobile, bus, motorcycle, van, trailer';
COMMENT ON COLUMN public.vehicles.assigned_driver_id IS 'Currently assigned driver for this vehicle';