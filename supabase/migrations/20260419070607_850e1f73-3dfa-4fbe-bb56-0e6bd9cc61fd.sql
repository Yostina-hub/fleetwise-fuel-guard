-- Extend `workflows` to host SOP definitions alongside automation workflows.
-- Backwards-compatible: all new columns are nullable / defaulted.

ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'automation',
  ADD COLUMN IF NOT EXISTS sop_type text,
  ADD COLUMN IF NOT EXISTS sop_code text,
  ADD COLUMN IF NOT EXISTS definition jsonb;

-- Constrain kind to known values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflows_kind_check'
  ) THEN
    ALTER TABLE public.workflows
      ADD CONSTRAINT workflows_kind_check
      CHECK (kind IN ('automation', 'sop'));
  END IF;
END $$;

-- One SOP row per (organization, sop_type).
CREATE UNIQUE INDEX IF NOT EXISTS workflows_org_sop_type_uniq
  ON public.workflows (organization_id, sop_type)
  WHERE kind = 'sop' AND sop_type IS NOT NULL;

-- Helpful filter index for the builder list.
CREATE INDEX IF NOT EXISTS workflows_kind_org_idx
  ON public.workflows (organization_id, kind);

COMMENT ON COLUMN public.workflows.kind IS
  'automation = visual builder automation (nodes/edges). sop = standard operating procedure definition driven by `definition` jsonb.';
COMMENT ON COLUMN public.workflows.sop_type IS
  'Stable machine key for SOPs (e.g. safety_comfort, vehicle_request). Matches WorkflowConfig.type in code.';
COMMENT ON COLUMN public.workflows.sop_code IS
  'Human SOP code (e.g. FMG-SAF 15) shown as a badge.';
COMMENT ON COLUMN public.workflows.definition IS
  'Full serialized WorkflowConfig (stages, lanes, intakeFields, intakeFormKey, etc.) for SOP rows.';