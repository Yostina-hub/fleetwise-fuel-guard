-- Add unique constraint on plate_number per organization to prevent duplicates
ALTER TABLE public.vehicles 
ADD CONSTRAINT vehicles_plate_number_org_unique UNIQUE (organization_id, plate_number);