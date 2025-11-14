-- Drop and recreate the view with correct schema
DROP VIEW IF EXISTS latest_driver_scores;

CREATE VIEW latest_driver_scores AS
SELECT DISTINCT ON (driver_id)
  id,
  driver_id,
  vehicle_id,
  organization_id,
  score_period_start,
  score_period_end,
  overall_score,
  safety_rating,
  speeding_score,
  braking_score,
  acceleration_score,
  idle_score,
  speed_violations,
  harsh_braking_events,
  harsh_acceleration_events,
  total_drive_time,
  total_idle_time,
  total_distance,
  risk_factors,
  recommendations,
  trend,
  created_at,
  updated_at
FROM driver_behavior_scores
ORDER BY driver_id, score_period_end DESC;