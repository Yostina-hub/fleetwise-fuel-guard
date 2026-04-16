ALTER TABLE public.fuel_clarification_requests
ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;