DO $$
DECLARE
  org RECORD;
  new_form_id uuid;
  new_version_id uuid;
  any_user uuid;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    IF EXISTS (
      SELECT 1 FROM public.forms
      WHERE organization_id = org.id AND key = 'driver_registration'
    ) THEN
      CONTINUE;
    END IF;

    SELECT user_id INTO any_user
    FROM public.user_roles
    WHERE role = 'org_admin'::public.app_role
    LIMIT 1;

    IF any_user IS NULL THEN
      SELECT user_id INTO any_user FROM public.user_roles LIMIT 1;
    END IF;

    IF any_user IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.forms (organization_id, key, name, description, category, created_by)
    VALUES (
      org.id,
      'driver_registration',
      'Driver Registration',
      'Register a new driver: identity, license, address, employment, banking, emergency contact, and portal credentials.',
      'hr',
      any_user
    )
    RETURNING id INTO new_form_id;

    INSERT INTO public.form_versions (
      form_id, organization_id, version_number, status, schema, settings, published_at, published_by, created_by
    )
    VALUES (
      new_form_id,
      org.id,
      1,
      'published',
      '{"version":1,"fields":[]}'::jsonb,
      '{"submitLabel":"Register driver","cancelLabel":"Cancel","successMessage":"Driver registered."}'::jsonb,
      now(),
      any_user,
      any_user
    )
    RETURNING id INTO new_version_id;

    UPDATE public.forms
    SET current_published_version_id = new_version_id
    WHERE id = new_form_id;
  END LOOP;
END $$;