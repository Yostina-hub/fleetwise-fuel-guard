-- Add missing foreign key from driver_behavior_scores to drivers
ALTER TABLE public.driver_behavior_scores
  ADD CONSTRAINT driver_behavior_scores_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES public.drivers(id);