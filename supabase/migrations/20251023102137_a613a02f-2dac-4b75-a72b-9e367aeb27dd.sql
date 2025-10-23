-- Add foreign key constraints for incidents table only (the ones causing the sync error)
DO $$ 
BEGIN
    -- Add incidents -> vehicles foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'incidents_vehicle_id_fkey'
    ) THEN
        ALTER TABLE public.incidents
        ADD CONSTRAINT incidents_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;

    -- Add incidents -> drivers foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'incidents_driver_id_fkey'
    ) THEN
        ALTER TABLE public.incidents
        ADD CONSTRAINT incidents_driver_id_fkey 
        FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
    END IF;

    -- Add work_orders -> vehicles foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'work_orders_vehicle_id_fkey'
    ) THEN
        ALTER TABLE public.work_orders
        ADD CONSTRAINT work_orders_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;
END $$;