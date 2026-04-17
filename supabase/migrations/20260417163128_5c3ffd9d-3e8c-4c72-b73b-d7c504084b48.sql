UPDATE public.workflow_tasks t
SET
  form_schema = COALESCE(n->'data'->'config'->'fields', '[]'::jsonb),
  actions = COALESCE(n->'data'->'config'->'actions', '[]'::jsonb),
  form_key = NULLIF(n->'data'->'config'->>'form_key', ''),
  context = COALESCE(t.context, '{}'::jsonb)
FROM public.workflows w,
     jsonb_array_elements(w.nodes) n
WHERE t.workflow_id = w.id
  AND t.node_id = (n->>'id')
  AND t.status = 'pending'
  AND w.name LIKE 'Fleet Inspection%';