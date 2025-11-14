-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.latest_driver_scores;

CREATE VIEW public.latest_driver_scores 
WITH (security_invoker = true) AS
SELECT DISTINCT ON (driver_id) *
FROM public.driver_behavior_scores
ORDER BY driver_id, score_period_end DESC;