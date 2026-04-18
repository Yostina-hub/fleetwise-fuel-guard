UPDATE form_versions
SET schema = jsonb_set(
  schema, '{fields}',
  (
    WITH base AS (
      SELECT elem, ord
      FROM jsonb_array_elements(schema->'fields') WITH ORDINALITY AS t(elem, ord)
      WHERE elem->>'key' NOT IN ('date','start_time','end_time','project_number','start_date','end_date')
    ),
    inserted AS (
      SELECT jsonb_build_object('id','f_start_date','key','start_date','type','date','label','Start Date','layout',jsonb_build_object('colSpan',1),'required',true) AS elem, 1.1 AS ord
      UNION ALL
      SELECT jsonb_build_object('id','f_end_date','key','end_date','type','date','label','End Date','layout',jsonb_build_object('colSpan',1),'required',true), 1.2
      UNION ALL
      SELECT jsonb_build_object(
        'id','f_project_number','key','project_number','type','text','label','Project Number',
        'layout',jsonb_build_object('colSpan',1),'required',true,'placeholder','Project Number',
        'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','project_operation')
      ), 1.3
    )
    SELECT jsonb_agg(elem ORDER BY ord)
    FROM (SELECT elem, ord FROM base UNION ALL SELECT elem, ord FROM inserted) c
  )
), updated_at = now()
WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818'
  AND version_number = 5;

-- Publish version 5 so the rendered Fleet Request Form picks it up
UPDATE forms
SET current_published_version_id = (
  SELECT id FROM form_versions
  WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818' AND version_number = 5
), updated_at = now()
WHERE id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818';