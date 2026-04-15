
-- Add workflow Phase 2+ columns to vehicle_requests
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS project_number TEXT,
  ADD COLUMN IF NOT EXISTS pool_review_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pool_reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS pool_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_checked_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_checkin_odometer NUMERIC,
  ADD COLUMN IF NOT EXISTS driver_checkout_odometer NUMERIC,
  ADD COLUMN IF NOT EXISTS driver_checkin_notes TEXT,
  ADD COLUMN IF NOT EXISTS cross_pool_assignment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_pool_name TEXT,
  ADD COLUMN IF NOT EXISTS sms_notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS destination_geofence_id UUID REFERENCES public.geofences(id),
  ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distance_log_km NUMERIC;
