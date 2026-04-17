-- 1. Strip incorrect form_key from list_vehicles and assign_inspector nodes in workflows
UPDATE public.workflows w
SET nodes = (
  SELECT jsonb_agg(
    CASE 
      WHEN (n->>'id') IN ('list_vehicles', 'assign_inspector') 
        AND (n->'data'->'config'->>'form_key') = 'vehicle_inspection'
      THEN jsonb_set(
        n,
        '{data,config}',
        (n->'data'->'config') - 'form_key' - 'prefill'
      )
      ELSE n
    END
  )
  FROM jsonb_array_elements(w.nodes) n
)
WHERE w.name LIKE 'Fleet Inspection%'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(w.nodes) n
    WHERE (n->>'id') IN ('list_vehicles', 'assign_inspector')
      AND (n->'data'->'config'->>'form_key') = 'vehicle_inspection'
  );

-- 2. Backfill any pending tasks: clear form_key for the same node_ids
UPDATE public.workflow_tasks
SET form_key = NULL, context = '{}'::jsonb
WHERE status = 'pending'
  AND node_id IN ('list_vehicles', 'assign_inspector')
  AND form_key = 'vehicle_inspection';