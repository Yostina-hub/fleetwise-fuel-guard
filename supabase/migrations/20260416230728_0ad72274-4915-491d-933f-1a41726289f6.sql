
CREATE TABLE IF NOT EXISTS public.internal_accident_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_number text NOT NULL UNIQUE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  supervisor_name text,
  accident_date timestamptz NOT NULL,
  accident_location text,
  description text,
  damage_description text,
  damaged_parts text[],
  report_document_url text,
  photos text[],
  workflow_stage text NOT NULL DEFAULT 'driver_report',
  status text NOT NULL DEFAULT 'open',
  document_analyzed_at timestamptz,
  document_analyzed_by uuid,
  covered_by_insurance boolean,
  coverage_notes text,
  third_party_claim_id uuid REFERENCES public.accident_claims(id) ON DELETE SET NULL,
  negligence_check_at timestamptz,
  negligence_found boolean,
  negligence_notes text,
  discipline_action_reference text,
  discipline_action_at timestamptz,
  consolidated_at timestamptz,
  consolidation_notes text,
  existing_contract_check_at timestamptz,
  existing_contract_found boolean,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  procurement_requested_at timestamptz,
  procurement_request_number text,
  scm_short_list jsonb,
  selected_supplier text,
  selected_supplier_contact text,
  supplier_notified_at timestamptz,
  estimated_cost numeric,
  approved_cost numeric,
  po_number text,
  po_url text,
  po_approved_at timestamptz,
  maintenance_started_at timestamptz,
  maintenance_completed_at timestamptz,
  is_complete boolean,
  follow_up_notes text,
  scd_confirmation_at timestamptz,
  scd_confirmation_url text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_internal_accident_claims_org ON public.internal_accident_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_accident_claims_stage ON public.internal_accident_claims(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_internal_accident_claims_vehicle ON public.internal_accident_claims(vehicle_id);

ALTER TABLE public.internal_accident_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view internal accident claims in their org"
  ON public.internal_accident_claims FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create internal accident claims in their org"
  ON public.internal_accident_claims FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update internal accident claims in their org"
  ON public.internal_accident_claims FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete internal accident claims"
  ON public.internal_accident_claims FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'org_admin'::app_role));

CREATE TRIGGER trg_internal_accident_claims_updated_at
  BEFORE UPDATE ON public.internal_accident_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.internal_claim_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.internal_accident_claims(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  decision text,
  performed_by uuid,
  performed_by_name text,
  notes text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_claim_transitions_claim ON public.internal_claim_transitions(claim_id);

ALTER TABLE public.internal_claim_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view internal claim transitions in their org"
  ON public.internal_claim_transitions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert internal claim transitions in their org"
  ON public.internal_claim_transitions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
