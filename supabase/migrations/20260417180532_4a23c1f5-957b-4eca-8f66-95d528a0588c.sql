-- Strip stale form_key from FMG-INS 01 Full SOP workflow node configs.
-- The stored workflow nodes had form_key="vehicle_inspection" baked in,
-- which made the Task Inbox open the wrong intake form for stage actions.
UPDATE workflows
SET nodes = (
  SELECT jsonb_agg(
    CASE
      WHEN node->'data'->'config' ? 'form_key'
        AND node->>'id' IN ('s1_list','s2_ready','s3_pm','s5_ready','s6_schedule','s7_send','s9_back','s10_cert','s11_payreq','s12_advance','s13_confirm','s14_collect','s15_pay','s16_finance')
      THEN jsonb_set(node, '{data,config}', (node->'data'->'config') - 'form_key')
      ELSE node
    END
  )
  FROM jsonb_array_elements(nodes::jsonb) AS node
)
WHERE name LIKE '%FMG-INS 01%Full SOP%';

-- Also clear stale form_key on still-pending tasks for these nodes so the
-- inbox refresh picks up the corrected configuration immediately.
UPDATE workflow_tasks t
SET form_key = NULL
FROM workflows w
WHERE t.workflow_id = w.id
  AND w.name LIKE '%FMG-INS 01%Full SOP%'
  AND t.status = 'pending'
  AND t.node_id IN ('s1_list','s2_ready','s3_pm','s5_ready','s6_schedule','s7_send','s9_back','s10_cert','s11_payreq','s12_advance','s13_confirm','s14_collect','s15_pay','s16_finance')
  AND t.form_key IS NOT NULL;