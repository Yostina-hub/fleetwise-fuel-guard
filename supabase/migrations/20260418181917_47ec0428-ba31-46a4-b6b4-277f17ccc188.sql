-- Insert Project Number field after request_type, conditional on project_operation
WITH src AS (
  SELECT id, schema FROM form_versions
  WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818' AND version_number = 5
),
new_field AS (
  SELECT jsonb_build_object(
    'id','f_project_number',
    'key','project_number',
    'type','text',
    'label','Project Number',
    'layout', jsonb_build_object('colSpan',2),
    'required',true,
    'placeholder','Enter project number',
    'visibleWhen', jsonb_build_object('field','request_type','operator','equals','value','project_operation')
  ) AS f
),
rebuilt AS (
  SELECT src.id,
    jsonb_set(
      src.schema, '{fields}',
      (
        SELECT jsonb_agg(elem ORDER BY ord)
        FROM (
          SELECT elem, ord FROM jsonb_array_elements(src.schema->'fields') WITH ORDINALITY AS t(elem, ord)
          UNION ALL
          SELECT (SELECT f FROM new_field), 1.5
        ) c
      )
    ) AS new_schema
  FROM src
)
UPDATE form_versions fv
SET schema = rebuilt.new_schema, updated_at = now()
FROM rebuilt
WHERE fv.id = rebuilt.id;