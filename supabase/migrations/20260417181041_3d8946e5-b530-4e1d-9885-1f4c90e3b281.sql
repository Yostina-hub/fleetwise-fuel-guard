-- Fix FMG-INS 01 SOP edges so the workflow runner can branch correctly.
-- Every edge has a `label` matching the upstream task action id, but the
-- runner branches on `sourceHandle`. Without it, all child branches fired
-- regardless of decision, causing the Annual path to also walk the Internal
-- subgraph. Copy label → sourceHandle for any edge missing it.
UPDATE workflows
SET edges = (
  SELECT jsonb_agg(
    CASE
      WHEN (edge ? 'label') AND NOT (edge ? 'sourceHandle')
      THEN edge || jsonb_build_object('sourceHandle', edge->>'label')
      ELSE edge
    END
  )
  FROM jsonb_array_elements(edges::jsonb) AS edge
)
WHERE name LIKE '%FMG-INS 01%Full SOP%';

-- Cancel the stale orphan task that was created from the routing bug
-- (s4_inspector spawned by Annual path via the unfiltered s3_pm transition)
UPDATE workflow_tasks
SET status = 'cancelled'
WHERE run_id = 'b0534d85-2252-48b6-9f26-354ab8960c76'
  AND node_id IN ('s3_pm','s4_inspector')
  AND status = 'pending';