-- 1) Split handle_form_version_publish into BEFORE (set columns) and AFTER (update parent + audit)
--    The previous BEFORE INSERT trigger tried to point forms.current_published_version_id at NEW.id
--    before the row existed, causing FK error 23503 on forms_current_published_version_fk.

CREATE OR REPLACE FUNCTION public.handle_form_version_publish_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
     OR (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
    NEW.published_by := COALESCE(NEW.published_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_form_version_publish_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
     OR (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
    UPDATE public.forms
       SET current_published_version_id = NEW.id,
           updated_at = now()
     WHERE id = NEW.form_id;

    BEGIN
      INSERT INTO public.delegation_audit_log
        (organization_id, source_table, source_id, action, actor_id, summary, scope, new_values)
      VALUES
        (NEW.organization_id, 'form_versions', NEW.id, 'publish', auth.uid(),
         format('Published version %s of form %s', NEW.version_number, NEW.form_id),
         'forms',
         jsonb_build_object('form_id', NEW.form_id, 'version_number', NEW.version_number));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$function$;

-- Replace the old trigger with the two-phase version.
DROP TRIGGER IF EXISTS trg_form_versions_publish ON public.form_versions;

CREATE TRIGGER trg_form_versions_publish_before
BEFORE INSERT OR UPDATE ON public.form_versions
FOR EACH ROW EXECUTE FUNCTION public.handle_form_version_publish_before();

CREATE TRIGGER trg_form_versions_publish_after
AFTER INSERT OR UPDATE ON public.form_versions
FOR EACH ROW EXECUTE FUNCTION public.handle_form_version_publish_after();

-- 2) Backfill: any form without ANY version_row gets an empty draft so the editor can hydrate.
--    (Forms produced by the broken clone path before the trigger fix.)
INSERT INTO public.form_versions (form_id, organization_id, status, schema, settings, created_by)
SELECT f.id, f.organization_id, 'draft',
       '{"version":1,"fields":[]}'::jsonb,
       '{}'::jsonb,
       f.created_by
FROM public.forms f
LEFT JOIN public.form_versions fv ON fv.form_id = f.id
WHERE fv.id IS NULL;
