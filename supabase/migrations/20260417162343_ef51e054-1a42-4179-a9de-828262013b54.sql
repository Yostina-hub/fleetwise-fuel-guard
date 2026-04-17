UPDATE public.workflow_tasks t
SET 
  form_key = COALESCE(t.form_key, (n.node->'data'->'config'->>'form_key')),
  context = COALESCE(NULLIF(t.context, '{}'::jsonb), 
    COALESCE(n.node->'data'->'config'->'prefill', '{}'::jsonb) || 
    COALESCE(n.node->'data'->'config'->'context', '{}'::jsonb))
FROM public.workflows w,
     LATERAL jsonb_array_elements(w.nodes) AS n(node)
WHERE t.workflow_id = w.id
  AND t.node_id = (n.node->>'id')
  AND t.status = 'pending'
  AND (n.node->'data'->'config'->>'form_key') IS NOT NULL;