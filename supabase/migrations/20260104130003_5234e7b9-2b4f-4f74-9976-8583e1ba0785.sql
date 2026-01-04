-- Make tank_capacity_liters optional (nullable)
ALTER TABLE public.vehicles ALTER COLUMN tank_capacity_liters DROP NOT NULL;