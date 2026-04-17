-- Strip stale `form_key: vehicle_inspection` from all action-only stages of
-- the FMG-INS 01 Full SOP workflow. The intake checklist form should ONLY
-- run for stage 1 (s1_list — "Create Work Request — Vehicle Inspection").
UPDATE workflows
SET nodes = (
  SELECT jsonb_agg(
    CASE
      WHEN (n->>'id') IN (
        's2_ready','s3_pm','s4_inspector','s5_choose_path',
        's6_schedule','s7_send','s8_perform','s8b_internal_result',
        's9_pass','s9_fail','s10_pay','s11_certificate','s12_return',
        's13_fix','s14_recheck','s15_finance','s16_done'
      )
      THEN jsonb_set(
        n,
        '{data,config}',
        COALESCE(n->'data'->'config', '{}'::jsonb) - 'form_key',
        true
      )
      ELSE n
    END
  )
  FROM jsonb_array_elements(nodes::jsonb) n
)
WHERE id = '536fe3f7-3bcc-4c53-a0ed-97b31006938e';

-- Clear stale form_key on currently-pending tasks for those same stages so
-- the in-flight run advances cleanly without reopening the intake form.
UPDATE workflow_tasks
SET form_key = NULL
WHERE run_id IN (
  SELECT id FROM workflow_runs
  WHERE workflow_id = '536fe3f7-3bcc-4c53-a0ed-97b31006938e'
)
AND status = 'pending'
AND node_id IN (
  's2_ready','s3_pm','s4_inspector','s5_choose_path',
  's6_schedule','s7_send','s8_perform','s8b_internal_result',
  's9_pass','s9_fail','s10_pay','s11_certificate','s12_return',
  's13_fix','s14_recheck','s15_finance','s16_done'
);