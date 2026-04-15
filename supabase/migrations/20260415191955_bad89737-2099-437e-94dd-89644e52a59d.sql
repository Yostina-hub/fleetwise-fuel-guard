-- Add incident_type column to accident_claims
ALTER TABLE public.accident_claims
ADD COLUMN IF NOT EXISTS incident_type text NOT NULL DEFAULT 'not_covered_by_insurance';

-- Add comment for documentation
COMMENT ON COLUMN public.accident_claims.incident_type IS 'Type of incident: not_covered_by_insurance, et_fault_on_third_party, third_party_damage_on_et';