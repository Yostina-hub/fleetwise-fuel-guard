-- Fix the broken driver policy on jobs table
DROP POLICY IF EXISTS "Drivers can view their assigned jobs" ON public.jobs;
CREATE POLICY "Drivers can view their assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );