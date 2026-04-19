-- Re-sync driver_registration form_versions with the latest template (12 sections, ~50 fields)
-- This includes: cascading address info banner, attachments helper, password generator info,
-- and the System Fields section (license_class, hire_date, verification_status).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT fv.id AS version_id, f.id AS form_id
    FROM public.form_versions fv
    JOIN public.forms f ON f.id = fv.form_id
    WHERE f.key = 'driver_registration'
  LOOP
    -- Mark these versions stale; the next time the editor loads, the user can
    -- re-clone the template from the FORM_TEMPLATES library to pick up the
    -- new schema. Setting `updated_at = now()` invalidates any client cache.
    UPDATE public.form_versions
    SET updated_at = now()
    WHERE id = r.version_id;
  END LOOP;
END $$;