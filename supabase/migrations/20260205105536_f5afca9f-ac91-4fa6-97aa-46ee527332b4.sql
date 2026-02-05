-- =====================================================
-- REVOLUTIONARY DRIVER MANAGEMENT SYSTEM TABLES
-- =====================================================

-- 1. Driver Achievements & Gamification System
CREATE TABLE public.driver_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  badge_emoji TEXT NOT NULL DEFAULT '🏆',
  badge_color TEXT DEFAULT '#FFD700',
  category TEXT NOT NULL DEFAULT 'safety', -- safety, efficiency, consistency, milestone
  xp_reward INTEGER NOT NULL DEFAULT 100,
  requirements JSONB DEFAULT '{}', -- {metric: 'trips', threshold: 100, condition: 'gte'}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Driver Earned Achievements
CREATE TABLE public.driver_earned_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.driver_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(driver_id, achievement_id)
);

-- 3. Driver XP & Level System
CREATE TABLE public.driver_xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'trip_completed', 'achievement_earned', 'training_completed', 'perfect_week'
  reference_id UUID, -- trip_id, achievement_id, etc.
  reference_type TEXT, -- 'trip', 'achievement', 'training'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Driver Gamification Stats (Materialized for Performance)
CREATE TABLE public.driver_gamification_stats (
  driver_id UUID PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  achievements_count INTEGER NOT NULL DEFAULT 0,
  weekly_rank INTEGER,
  monthly_rank INTEGER,
  all_time_rank INTEGER,
  perfect_trips INTEGER NOT NULL DEFAULT 0,
  eco_score NUMERIC(5,2) DEFAULT 0, -- fuel efficiency rating
  reliability_score NUMERIC(5,2) DEFAULT 0, -- on-time delivery rate
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Driver Training & Certifications
CREATE TABLE public.driver_training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'safety', 'compliance', 'efficiency', 'customer_service'
  content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'document', 'quiz', 'interactive'
  content_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 50,
  is_required BOOLEAN DEFAULT false,
  pass_score INTEGER DEFAULT 80,
  expires_months INTEGER, -- null = never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Driver Training Progress
CREATE TABLE public.driver_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.driver_training_courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'failed', 'expired'
  progress_percent INTEGER DEFAULT 0,
  score INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, course_id)
);

-- 7. Hours of Service (HOS) Tracking
CREATE TABLE public.driver_hos_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL, -- 'off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  location_start TEXT,
  location_end TEXT,
  lat_start NUMERIC(10, 6),
  lng_start NUMERIC(10, 6),
  lat_end NUMERIC(10, 6),
  lng_end NUMERIC(10, 6),
  odometer_start NUMERIC(10, 1),
  odometer_end NUMERIC(10, 1),
  notes TEXT,
  is_violation BOOLEAN DEFAULT false,
  violation_type TEXT, -- 'driving_limit', 'break_required', 'weekly_limit'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Driver Fatigue Risk Indicators
CREATE TABLE public.driver_fatigue_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fatigue_risk_level TEXT NOT NULL, -- 'low', 'moderate', 'high', 'critical'
  risk_score NUMERIC(5,2) NOT NULL, -- 0-100
  driving_hours_24h NUMERIC(5,2),
  driving_hours_8_days NUMERIC(6,2),
  hours_since_rest NUMERIC(5,2),
  consecutive_driving_minutes INTEGER,
  reaction_time_ms INTEGER, -- if measured
  eye_closure_events INTEGER, -- ADAS data
  lane_departure_events INTEGER,
  yawning_detected INTEGER,
  hard_braking_events INTEGER,
  recommendations JSONB DEFAULT '[]',
  data_source TEXT DEFAULT 'system', -- 'system', 'telematics', 'dashcam', 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AI-Powered Driver Insights
CREATE TABLE public.driver_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'risk_prediction', 'coaching_tip', 'performance_trend', 'fuel_optimization', 'route_suggestion'
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical', 'positive'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  confidence_score NUMERIC(5,2), -- 0-100
  data_points_used INTEGER,
  valid_until TIMESTAMPTZ,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Driver Performance Trends (Weekly Aggregates)
CREATE TABLE public.driver_weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  trips_completed INTEGER DEFAULT 0,
  distance_km NUMERIC(10,2) DEFAULT 0,
  driving_hours NUMERIC(6,2) DEFAULT 0,
  fuel_consumed_liters NUMERIC(10,2) DEFAULT 0,
  fuel_efficiency_km_per_liter NUMERIC(6,2),
  on_time_deliveries INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  safety_score NUMERIC(5,2),
  harsh_events_count INTEGER DEFAULT 0,
  idle_time_minutes INTEGER DEFAULT 0,
  revenue_generated NUMERIC(12,2) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  rank_change INTEGER DEFAULT 0, -- positive = improved, negative = declined
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, week_start)
);

-- 11. Driver Recognition & Rewards
CREATE TABLE public.driver_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL, -- 'bonus', 'gift_card', 'time_off', 'recognition', 'certificate'
  title TEXT NOT NULL,
  description TEXT,
  value_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  issued_by UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' -- 'active', 'redeemed', 'expired', 'cancelled'
);

-- 12. Driver Goals & Challenges
CREATE TABLE public.driver_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE, -- null = org-wide goal
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'personal', 'team', 'org_wide', 'challenge'
  metric TEXT NOT NULL, -- 'trips', 'distance', 'safety_score', 'fuel_efficiency', 'on_time_rate'
  target_value NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  xp_reward INTEGER DEFAULT 200,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'failed', 'cancelled'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Driver Communication & Announcements
CREATE TABLE public.driver_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE, -- null = broadcast to all
  sender_id UUID,
  message_type TEXT NOT NULL, -- 'announcement', 'alert', 'recognition', 'reminder', 'feedback'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  requires_acknowledgement BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.driver_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earned_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_hos_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_fatigue_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_weekly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables (using get_user_organization function)
CREATE POLICY "Users can manage driver_achievements in their org"
ON public.driver_achievements FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_earned_achievements in their org"
ON public.driver_earned_achievements FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_xp_ledger in their org"
ON public.driver_xp_ledger FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_gamification_stats in their org"
ON public.driver_gamification_stats FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_training_courses in their org"
ON public.driver_training_courses FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_training_progress in their org"
ON public.driver_training_progress FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_hos_logs in their org"
ON public.driver_hos_logs FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_fatigue_indicators in their org"
ON public.driver_fatigue_indicators FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_ai_insights in their org"
ON public.driver_ai_insights FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_weekly_stats in their org"
ON public.driver_weekly_stats FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_rewards in their org"
ON public.driver_rewards FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_goals in their org"
ON public.driver_goals FOR ALL USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can manage driver_communications in their org"
ON public.driver_communications FOR ALL USING (organization_id = get_user_organization(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_driver_xp_ledger_driver ON public.driver_xp_ledger(driver_id);
CREATE INDEX idx_driver_earned_achievements_driver ON public.driver_earned_achievements(driver_id);
CREATE INDEX idx_driver_training_progress_driver ON public.driver_training_progress(driver_id);
CREATE INDEX idx_driver_hos_logs_driver_date ON public.driver_hos_logs(driver_id, log_date);
CREATE INDEX idx_driver_fatigue_indicators_driver ON public.driver_fatigue_indicators(driver_id, recorded_at DESC);
CREATE INDEX idx_driver_ai_insights_driver ON public.driver_ai_insights(driver_id, created_at DESC);
CREATE INDEX idx_driver_weekly_stats_driver ON public.driver_weekly_stats(driver_id, week_start);
CREATE INDEX idx_driver_goals_driver ON public.driver_goals(driver_id, status);
CREATE INDEX idx_driver_communications_driver ON public.driver_communications(driver_id, created_at DESC);

-- Insert default achievements
INSERT INTO public.driver_achievements (organization_id, name, description, badge_emoji, category, xp_reward, requirements) VALUES
('00000000-0000-0000-0000-000000000001', 'First Trip', 'Complete your first trip', '🚗', 'milestone', 50, '{"metric": "trips", "threshold": 1, "condition": "gte"}'),
('00000000-0000-0000-0000-000000000001', 'Road Warrior', 'Complete 100 trips', '⚔️', 'milestone', 500, '{"metric": "trips", "threshold": 100, "condition": "gte"}'),
('00000000-0000-0000-0000-000000000001', 'Safety Champion', 'Maintain 90+ safety score for 30 days', '🛡️', 'safety', 1000, '{"metric": "safety_score", "threshold": 90, "duration_days": 30}'),
('00000000-0000-0000-0000-000000000001', 'Eco Driver', 'Achieve top 10% fuel efficiency', '🌿', 'efficiency', 300, '{"metric": "fuel_efficiency_percentile", "threshold": 90}'),
('00000000-0000-0000-0000-000000000001', 'Perfect Week', 'Complete a week with zero incidents', '⭐', 'safety', 200, '{"metric": "incident_free_days", "threshold": 7}'),
('00000000-0000-0000-0000-000000000001', 'On-Time Legend', 'Achieve 99% on-time delivery rate', '⏰', 'consistency', 400, '{"metric": "on_time_rate", "threshold": 99}'),
('00000000-0000-0000-0000-000000000001', 'Marathon Driver', 'Drive 10,000 km safely', '🏃', 'milestone', 750, '{"metric": "distance_km", "threshold": 10000}'),
('00000000-0000-0000-0000-000000000001', 'Training Master', 'Complete all required training courses', '📚', 'consistency', 500, '{"metric": "required_courses_completed", "threshold": 100, "is_percentage": true}'),
('00000000-0000-0000-0000-000000000001', 'Streak Keeper', 'Maintain a 30-day active streak', '🔥', 'consistency', 300, '{"metric": "streak_days", "threshold": 30}'),
('00000000-0000-0000-0000-000000000001', 'Night Owl', 'Complete 50 safe night trips', '🦉', 'safety', 400, '{"metric": "night_trips_safe", "threshold": 50}');

-- Insert default training courses
INSERT INTO public.driver_training_courses (organization_id, title, description, category, content_type, duration_minutes, xp_reward, is_required, pass_score) VALUES
('00000000-0000-0000-0000-000000000001', 'Defensive Driving Fundamentals', 'Learn essential defensive driving techniques to prevent accidents', 'safety', 'video', 45, 100, true, 80),
('00000000-0000-0000-0000-000000000001', 'Fatigue Management', 'Understanding and preventing driver fatigue', 'safety', 'interactive', 30, 75, true, 80),
('00000000-0000-0000-0000-000000000001', 'Fuel Efficiency Best Practices', 'Techniques to maximize fuel economy', 'efficiency', 'video', 25, 50, false, 70),
('00000000-0000-0000-0000-000000000001', 'Hours of Service Compliance', 'Federal HOS regulations and compliance requirements', 'compliance', 'document', 60, 100, true, 90),
('00000000-0000-0000-0000-000000000001', 'Customer Service Excellence', 'Delivering exceptional customer experiences', 'customer_service', 'interactive', 20, 50, false, 75),
('00000000-0000-0000-0000-000000000001', 'Emergency Response Procedures', 'How to handle accidents and emergencies', 'safety', 'video', 35, 75, true, 85),
('00000000-0000-0000-0000-000000000001', 'Load Securement', 'Proper techniques for securing cargo', 'compliance', 'video', 40, 75, true, 80),
('00000000-0000-0000-0000-000000000001', 'Eco-Driving Certification', 'Advanced fuel-saving driving techniques', 'efficiency', 'quiz', 45, 100, false, 80);