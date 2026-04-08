
-- Driver Contracts
CREATE TABLE public.driver_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  contract_number TEXT,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'seasonal', 'temporary', 'intern')),
  start_date DATE NOT NULL,
  end_date DATE,
  pay_rate NUMERIC(10,2),
  pay_frequency TEXT DEFAULT 'monthly' CHECK (pay_frequency IN ('hourly', 'daily', 'weekly', 'bi_weekly', 'monthly', 'annual')),
  pay_currency TEXT DEFAULT 'USD',
  probation_end_date DATE,
  department TEXT,
  position_title TEXT,
  supervisor_name TEXT,
  work_location TEXT,
  terms_summary TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expiring', 'expired', 'terminated', 'renewed')),
  renewal_alert_days INT DEFAULT 60,
  termination_date DATE,
  termination_reason TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_contracts FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_contracts_updated_at BEFORE UPDATE ON public.driver_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Driver Predictive Risk Scores
CREATE TABLE public.driver_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  composite_score NUMERIC(4,1) NOT NULL,
  behavior_component NUMERIC(4,1) DEFAULT 0,
  mvr_component NUMERIC(4,1) DEFAULT 0,
  incident_component NUMERIC(4,1) DEFAULT 0,
  compliance_component NUMERIC(4,1) DEFAULT 0,
  fatigue_component NUMERIC(4,1) DEFAULT 0,
  accident_probability NUMERIC(5,2),
  risk_tier TEXT DEFAULT 'low' CHECK (risk_tier IN ('low', 'moderate', 'elevated', 'high', 'critical')),
  on_watchlist BOOLEAN DEFAULT false,
  watchlist_reason TEXT,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  recommended_interventions JSONB DEFAULT '[]'::jsonb,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining', 'rapid_decline')),
  previous_score NUMERIC(4,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.driver_risk_scores FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TRIGGER update_driver_risk_scores_updated_at BEFORE UPDATE ON public.driver_risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_contracts_driver ON public.driver_contracts(driver_id);
CREATE INDEX idx_contracts_status ON public.driver_contracts(status, end_date);
CREATE INDEX idx_risk_driver ON public.driver_risk_scores(driver_id, score_date DESC);
CREATE INDEX idx_risk_watchlist ON public.driver_risk_scores(on_watchlist, risk_tier);
