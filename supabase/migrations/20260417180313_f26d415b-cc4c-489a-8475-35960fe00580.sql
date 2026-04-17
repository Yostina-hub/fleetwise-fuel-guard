UPDATE workflow_tasks
SET form_key = NULL
WHERE status = 'pending'
  AND node_id IN ('s1_list','s2_ready','s3_pm','s4_inspector','s5_ready','s6_schedule','s7_send','s8_perform','s9_back','s10_cert','s11_payreq','s12_advance','s13_confirm','s14_collect','s15_pay','s16_finance')
  AND form_key IS NOT NULL;