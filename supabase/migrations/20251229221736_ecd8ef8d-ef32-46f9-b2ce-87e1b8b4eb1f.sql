-- Fix trips.driver_id to reference drivers table instead of auth.users
-- First drop the existing constraint if it exists
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;

-- Add new foreign key constraint to drivers table
ALTER TABLE public.trips 
ADD CONSTRAINT trips_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;