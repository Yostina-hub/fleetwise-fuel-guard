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
      -- Daily Operation: Date (full width) + Start Time + End Time
      SELECT jsonb_build_object(
        'id','f_date','key','date','type','date','label','Date',
        'layout',jsonb_build_object('colSpan',2),'required',true,
        'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','daily_operation')
      ) AS elem, 1.10 AS ord
      UNION ALL
      SELECT jsonb_build_object(
        'id','f_start_time','key','start_time','type','time','label','Start Time',
        'layout',jsonb_build_object('colSpan',1),'required',true,
        'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','daily_operation')
      ), 1.11
      UNION ALL
      SELECT jsonb_build_object(
        'id','f_end_time','key','end_time','type','time','label','End Time',
        'layout',jsonb_build_object('colSpan',1),'required',true,
        'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','daily_operation')
      ), 1.12
      UNION ALL
      -- Field & Project Operation: Start Date + End Date
      SELECT jsonb_build_object(
        'id','f_start_date','key','start_date','type','date','label','Start Date',
        'layout',jsonb_build_object('colSpan',1),'required',true,
        'visibleWhen', jsonb_build_object('field','request_type','operator','in','value', jsonb_build_array('field_operation','project_operation'))
      ), 1.20
      UNION ALL
      SELECT jsonb_build_object(
        'id','f_end_date','key','end_date','type','date','label','End Date',
        'layout',jsonb_build_object('colSpan',1),'required',true,
        'visibleWhen', jsonb_build_object('field','request_type','operator','in','value', jsonb_build_array('field_operation','project_operation'))
      ), 1.21
      UNION ALL
      -- Project Operation only: Project Number
      SELECT jsonb_build_object(
        'id','f_project_number','key','project_number','type','text','label','Project Number',
        'layout',jsonb_build_object('colSpan',1),'required',true,'placeholder','Project Number',
        'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','project_operation')
      ), 1.22
    )
    SELECT jsonb_agg(elem ORDER BY ord)
    FROM (SELECT elem, ord FROM base UNION ALL SELECT elem, ord FROM inserted) c
  )
), updated_at = now()
WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818'
  AND version_number = 5;

-- Re-publish v5 so the rendered Fleet Request Form picks up the dynamic schema
UPDATE forms
SET current_published_version_id = (
  SELECT id FROM form_versions
  WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818' AND version_number = 5
), updated_at = now()
WHERE id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818';