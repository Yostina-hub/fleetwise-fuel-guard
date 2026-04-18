
UPDATE form_versions
SET schema = jsonb_set(
  schema,
  '{fields}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'f_start_date' THEN
          jsonb_build_object(
            'id','f_date','key','date','type','date','label','Date',
            'layout', jsonb_build_object('colSpan',2),'required',true
          )
        ELSE elem
      END
    ) || jsonb_build_array(
      jsonb_build_object('id','f_start_time','key','start_time','type','time','label','Start Time','layout',jsonb_build_object('colSpan',1),'required',true),
      jsonb_build_object('id','f_end_time','key','end_time','type','time','label','End Time','layout',jsonb_build_object('colSpan',1),'required',true)
    )
    FROM jsonb_array_elements(schema->'fields') AS elem
    WHERE elem->>'id' <> 'f_end_date'
  )
)
WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818'
  AND version_number = 5;

-- Reorder so time fields appear right after the date field
UPDATE form_versions
SET schema = jsonb_set(
  schema,
  '{fields}',
  (
    WITH ordered AS (
      SELECT elem, ord FROM jsonb_array_elements(schema->'fields') WITH ORDINALITY AS t(elem, ord)
    ),
    base AS (SELECT elem, ord FROM ordered WHERE elem->>'id' NOT IN ('f_start_time','f_end_time')),
    times AS (SELECT elem, (SELECT ord FROM base WHERE elem->>'id'='f_date') + (CASE WHEN elem->>'id'='f_start_time' THEN 0.1 ELSE 0.2 END) AS ord FROM ordered WHERE elem->>'id' IN ('f_start_time','f_end_time'))
    SELECT jsonb_agg(elem ORDER BY ord)
    FROM (SELECT elem, ord FROM base UNION ALL SELECT elem, ord FROM times) AS combined
  )
)
WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818'
  AND version_number = 5;
