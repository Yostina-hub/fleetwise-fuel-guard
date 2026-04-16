
-- Extend predictive maintenance with real AI fields
ALTER TABLE public.predictive_maintenance_scores
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_reasoning text,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS estimated_cost_impact_etb numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_downtime_days integer,
  ADD COLUMN IF NOT EXISTS component_health jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_parts text[],
  ADD COLUMN IF NOT EXISTS analysis_method text DEFAULT 'heuristic';

-- Trend snapshots for charting fleet health over time
CREATE TABLE IF NOT EXISTS public.predictive_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  avg_health_score numeric(5,2) NOT NULL,
  vehicles_analyzed integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  high_count integer NOT NULL DEFAULT 0,
  medium_count integer NOT NULL DEFAULT 0,
  low_count integer NOT NULL DEFAULT 0,
  total_estimated_cost_etb numeric(14,2) DEFAULT 0,
  analysis_method text DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_phs_org_date
  ON public.predictive_health_snapshots(organization_id, snapshot_date DESC);

ALTER TABLE public.predictive_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users view snapshots"
  ON public.predictive_health_snapshots FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users insert snapshots"
  ON public.predictive_health_snapshots FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
