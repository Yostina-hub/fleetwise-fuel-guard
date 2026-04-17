-- Attach reusable form keys to the appropriate Fleet Inspection (Builder) nodes.
-- This rewrites the `nodes` JSONB so the workflow runner & Inbox render the
-- existing Create Work Request / Vehicle Inspection / Oracle Work Order forms
-- instead of ad-hoc fields.

WITH mapping(node_id, form_key, prefill) AS (
  VALUES
    ('request_maint',      'create_work_request', jsonb_build_object('context', 'vehicle_maintenance', 'request_type', 'corrective')),
    ('assign_inspector',   'vehicle_inspection',  jsonb_build_object('inspection_type', 'pre_trip')),
    ('manage_breakdown',   'oracle_work_order',   jsonb_build_object()),
    ('perform_inspection', 'vehicle_inspection',  jsonb_build_object('inspection_type', 'annual'))
),
updated AS (
  SELECT
    w.id,
    (
      SELECT jsonb_agg(
        CASE
          WHEN m.node_id IS NOT NULL THEN
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  n,
                  '{data,config,form_key}',
                  to_jsonb(m.form_key),
                  true
                ),
                '{data,config,context}',
                m.prefill,
                true
              ),
              '{data,config,actions}',
              -- Single "submitted" action so the runner has a clean handle to follow.
              jsonb_build_array(
                jsonb_build_object('id', 'submitted', 'label', 'Open & Complete Form', 'variant', 'default')
              ),
              true
            )
          ELSE n
        END
      )
      FROM jsonb_array_elements(w.nodes) WITH ORDINALITY AS t(n, ord)
      LEFT JOIN mapping m ON m.node_id = n->>'id'
    ) AS new_nodes
  FROM workflows w
  WHERE w.name = 'Fleet Inspection (Builder)'
)
UPDATE workflows w
SET nodes = u.new_nodes,
    updated_at = now()
FROM updated u
WHERE w.id = u.id;

-- Re-route edges from `request_maint`, `assign_inspector` (pass_internal branch),
-- `manage_breakdown`, and `perform_inspection` so their outgoing edges use the
-- `submitted` source handle (since these nodes now auto-complete with that decision).
WITH edge_remap(src_node, old_handle, new_handle) AS (
  VALUES
    ('request_maint',      NULL,        'submitted'),
    ('manage_breakdown',   NULL,        'submitted')
    -- assign_inspector + perform_inspection still keep their pass/fail handles
    -- because the inspection result drives the branch — the runner will use
    -- the form result's `safe` field to choose pass vs fail.
),
updated AS (
  SELECT
    w.id,
    (
      SELECT jsonb_agg(
        CASE
          WHEN er.src_node IS NOT NULL THEN
            jsonb_set(e, '{sourceHandle}', to_jsonb(er.new_handle), true)
          ELSE e
        END
      )
      FROM jsonb_array_elements(w.edges) AS e
      LEFT JOIN edge_remap er
        ON er.src_node = e->>'source'
       AND (
            (er.old_handle IS NULL AND (e->>'sourceHandle') IS NULL)
         OR (e->>'sourceHandle') = er.old_handle
       )
    ) AS new_edges
  FROM workflows w
  WHERE w.name = 'Fleet Inspection (Builder)'
)
UPDATE workflows w
SET edges = u.new_edges,
    updated_at = now()
FROM updated u
WHERE w.id = u.id;