-- Remove the overly permissive catch-all policy on drivers
DROP POLICY IF EXISTS "Users can view drivers in their org" ON public.drivers;

-- Also remove duplicate self-view policy
DROP POLICY IF EXISTS "Drivers can view their own profile" ON public.drivers;