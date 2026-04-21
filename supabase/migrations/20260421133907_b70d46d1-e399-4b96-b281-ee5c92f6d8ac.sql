ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS pool_review_decision TEXT,
  ADD COLUMN IF NOT EXISTS pool_review_conditions TEXT,
  ADD COLUMN IF NOT EXISTS pool_review_notes TEXT;

COMMENT ON COLUMN public.vehicle_requests.pool_review_decision IS 'Pool supervisor contract decision: approved | rejected | changes_requested';
COMMENT ON COLUMN public.vehicle_requests.pool_review_conditions IS 'Conditions/terms attached by pool supervisor on approval (contract clauses).';
COMMENT ON COLUMN public.vehicle_requests.pool_review_notes IS 'Free-text notes/reason from the pool supervisor decision.';