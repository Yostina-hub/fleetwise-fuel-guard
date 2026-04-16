CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Disable only user-defined rate-limit triggers
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname, tgrelid::regclass AS tbl
    FROM pg_trigger
    WHERE tgrelid IN ('public.profiles'::regclass, 'public.user_roles'::regclass)
      AND tgname LIKE '%rate_limit%'
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE %s DISABLE TRIGGER %I', r.tbl, r.tgname);
  END LOOP;
END $$;

DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_pwd_hash text;
  v_users jsonb := '[
    {"email":"e2e-driver@demo.et","name":"E2E Driver","role":"driver"},
    {"email":"e2e-fleetops@demo.et","name":"E2E Fleet Ops","role":"operations_manager"},
    {"email":"e2e-maint@demo.et","name":"E2E Maintenance Lead","role":"maintenance_lead"},
    {"email":"e2e-scd@demo.et","name":"E2E SCD Sourcing","role":"org_admin"},
    {"email":"e2e-supplier@demo.et","name":"E2E Supplier","role":"operator"}
  ]'::jsonb;
  v_user jsonb;
  v_uid uuid;
BEGIN
  v_pwd_hash := extensions.crypt('TestPass123!', extensions.gen_salt('bf'));

  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    SELECT id INTO v_uid FROM auth.users WHERE email = v_user->>'email';
    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        v_user->>'email', v_pwd_hash, now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_user->>'name'),
        false, '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_user->>'email'), 'email', v_uid::text, now(), now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, full_name, organization_id)
    VALUES (v_uid, v_user->>'email', v_user->>'name', v_org)
    ON CONFLICT (id) DO UPDATE SET organization_id = v_org, full_name = EXCLUDED.full_name;

    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (v_uid, (v_user->>'role')::app_role, v_org)
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
  END LOOP;
END $$;

-- Re-enable
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname, tgrelid::regclass AS tbl
    FROM pg_trigger
    WHERE tgrelid IN ('public.profiles'::regclass, 'public.user_roles'::regclass)
      AND tgname LIKE '%rate_limit%'
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE TRIGGER %I', r.tbl, r.tgname);
  END LOOP;
END $$;