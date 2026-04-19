-- Migrate the in-flight DRIV-202604-00001 onboarding instance from legacy
-- 'application' to the new baseline's first stage 'doc_verify'.
WITH inst AS (
  SELECT id, organization_id, workflow_type
  FROM public.workflow_instances
  WHERE reference_number = 'DRIV-202604-00001'
    AND workflow_type = 'driver_onboarding'
    AND current_stage = 'application'
)
UPDATE public.workflow_instances wi
SET current_stage = 'doc_verify', updated_at = now()
FROM inst
WHERE wi.id = inst.id;

INSERT INTO public.workflow_transitions (
  organization_id, instance_id, workflow_type,
  from_stage, to_stage, from_lane, to_lane,
  decision, notes
)
SELECT
  organization_id, id, workflow_type,
  'application', 'doc_verify', 'hr', 'hr',
  'system_migration',
  'Auto-migrated: SOP updated to new 4-stage flow (Doc verify → Training → Activate). Stage remapped to doc_verify.'
FROM public.workflow_instances
WHERE reference_number = 'DRIV-202604-00001'
  AND workflow_type = 'driver_onboarding';