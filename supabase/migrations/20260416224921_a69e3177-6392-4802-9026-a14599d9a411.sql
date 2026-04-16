-- Extend accident_claims with workflow fields
ALTER TABLE public.accident_claims
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'driver_report',
  ADD COLUMN IF NOT EXISTS completeness_check text,
  ADD COLUMN IF NOT EXISTS completeness_checked_by uuid,
  ADD COLUMN IF NOT EXISTS completeness_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_to_insurance_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_to_insurance_by uuid,
  ADD COLUMN IF NOT EXISTS within_insurance_coverage boolean,
  ADD COLUMN IF NOT EXISTS within_limit boolean,
  ADD COLUMN IF NOT EXISTS third_party_dealt_at timestamptz,
  ADD COLUMN IF NOT EXISTS finance_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS finance_notified_by uuid,
  ADD COLUMN IF NOT EXISTS settlement_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS settlement_reference text,
  ADD COLUMN IF NOT EXISTS notification_letter_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_letter_sent_by uuid,
  ADD COLUMN IF NOT EXISTS notification_letter_url text;

-- Workflow transitions audit log
CREATE TABLE IF NOT EXISTS public.claim_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.accident_claims(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  decision text,
  performed_by uuid,
  performed_by_name text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cwt_claim ON public.claim_workflow_transitions(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwt_org ON public.claim_workflow_transitions(organization_id, created_at DESC);

ALTER TABLE public.claim_workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users view claim transitions" ON public.claim_workflow_transitions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users insert claim transitions" ON public.claim_workflow_transitions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users update claim transitions" ON public.claim_workflow_transitions
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users delete claim transitions" ON public.claim_workflow_transitions
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));