UPDATE form_versions
SET schema = jsonb_set(
  schema, '{fields}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'key' = 'departure_place' THEN
          (elem - 'placeholder')
            || jsonb_build_object(
              'type','location',
              'placeholder','📍 Search departure place',
              'latKey','departure_lat',
              'lngKey','departure_lng'
            )
        WHEN elem->>'key' = 'destination' THEN
          (elem - 'placeholder')
            || jsonb_build_object(
              'type','location',
              'placeholder','📍 Search destination',
              'latKey','destination_lat',
              'lngKey','destination_lng'
            )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(schema->'fields') AS elem
  )
), updated_at = now()
WHERE form_id = '3d2ea607-3507-4bed-b2ef-ae9843e9b818'
  AND version_number = 5;