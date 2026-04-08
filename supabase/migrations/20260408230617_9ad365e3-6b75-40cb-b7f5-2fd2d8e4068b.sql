
-- MVR Records
CREATE TABLE public.driver_mvr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  pull_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_source TEXT,
  violations JSONB DEFAULT '[]'::jsonb,
  violation_count INT DEFAULT 0,
  points_total INT DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  suspensions_found BOOLEAN DEFAULT false,
  dui_found BOOLEAN DEFAULT false,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'flagged', 'cleared')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  next_pull_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_mvr_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_mvr_records FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_mvr_records_updated_at BEFORE UPDATE ON public.driver_mvr_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Driver Cost Allocation
CREATE TABLE public.driver_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fuel_cost NUMERIC(12,2) DEFAULT 0,
  maintenance_cost NUMERIC(12,2) DEFAULT 0,
  toll_cost NUMERIC(12,2) DEFAULT 0,
  fine_cost NUMERIC(12,2) DEFAULT 0,
  insurance_cost NUMERIC(12,2) DEFAULT 0,
  other_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (fuel_cost + maintenance_cost + toll_cost + fine_cost + insurance_cost + other_cost) STORED,
  cost_per_km NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_cost_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_cost_allocations FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_cost_allocations_updated_at BEFORE UPDATE ON public.driver_cost_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Performance Reviews
CREATE TABLE public.driver_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  review_type TEXT DEFAULT 'quarterly' CHECK (review_type IN ('monthly', 'quarterly', 'annual', 'probation', 'incident')),
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  reviewer_id UUID,
  reviewer_name TEXT,
  overall_score NUMERIC(3,1),
  safety_score NUMERIC(3,1),
  efficiency_score NUMERIC(3,1),
  compliance_score NUMERIC(3,1),
  customer_score NUMERIC(3,1),
  strengths TEXT[],
  improvement_areas TEXT[],
  goals JSONB DEFAULT '[]'::jsonb,
  improvement_plan TEXT,
  driver_comments TEXT,
  manager_comments TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'pending_acknowledgement', 'completed', 'disputed')),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_performance_reviews FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_performance_reviews_updated_at BEFORE UPDATE ON public.driver_performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fuel Card Assignments
CREATE TABLE public.driver_fuel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  card_provider TEXT,
  card_type TEXT DEFAULT 'fuel_only' CHECK (card_type IN ('fuel_only', 'fuel_maintenance', 'universal')),
  daily_limit NUMERIC(10,2),
  monthly_limit NUMERIC(10,2),
  current_month_spent NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'lost', 'expired')),
  issued_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  last_transaction_at TIMESTAMPTZ,
  suspicious_activity_flag BOOLEAN DEFAULT false,
  suspicious_activity_notes TEXT,
  pin_last_changed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_fuel_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_fuel_cards FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_fuel_cards_updated_at BEFORE UPDATE ON public.driver_fuel_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compliance Calendar Events
CREATE TABLE public.driver_compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('license_renewal', 'medical_exam', 'training_due', 'mvr_pull', 'certification_renewal', 'contract_renewal', 'insurance_renewal', 'drug_test', 'background_check', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'overdue', 'completed', 'waived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reminder_days INT[] DEFAULT '{90, 60, 30, 14, 7}'::int[],
  last_reminder_sent TIMESTAMPTZ,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_compliance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_compliance_events FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_compliance_events_updated_at BEFORE UPDATE ON public.driver_compliance_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-Coaching Workflows
CREATE TABLE public.driver_coaching_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('score_drop', 'incident', 'violation', 'complaint', 'scheduled', 'manual')),
  trigger_details JSONB,
  coaching_type TEXT DEFAULT 'self_review' CHECK (coaching_type IN ('self_review', 'one_on_one', 'group_session', 'online_course', 'ride_along', 'simulator')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'escalated')),
  assigned_coach_id UUID,
  assigned_coach_name TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  score_before NUMERIC(4,1),
  score_after NUMERIC(4,1),
  improvement_pct NUMERIC(5,2),
  session_notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  follow_up_date DATE,
  effectiveness_rating INT CHECK (effectiveness_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_coaching_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_coaching_workflows FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_coaching_workflows_updated_at BEFORE UPDATE ON public.driver_coaching_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_mvr_driver ON public.driver_mvr_records(driver_id);
CREATE INDEX idx_mvr_org ON public.driver_mvr_records(organization_id);
CREATE INDEX idx_cost_driver_period ON public.driver_cost_allocations(driver_id, period_start);
CREATE INDEX idx_reviews_driver ON public.driver_performance_reviews(driver_id);
CREATE INDEX idx_fuel_cards_driver ON public.driver_fuel_cards(driver_id);
CREATE INDEX idx_compliance_due ON public.driver_compliance_events(due_date, status);
CREATE INDEX idx_compliance_driver ON public.driver_compliance_events(driver_id);
CREATE INDEX idx_coaching_driver ON public.driver_coaching_workflows(driver_id);
CREATE INDEX idx_coaching_status ON public.driver_coaching_workflows(status);
