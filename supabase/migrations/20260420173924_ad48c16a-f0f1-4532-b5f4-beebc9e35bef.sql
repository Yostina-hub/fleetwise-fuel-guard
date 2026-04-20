DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'e2e-requester@demo.et';

  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'e2e-requester@demo.et',
      crypt('TestRequester2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"E2E Test Requester"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'e2e-requester@demo.et', 'email_verified', true),
      'email', now(), now(), now());
  ELSE
    v_user_id := v_existing;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (v_user_id, 'e2e-requester@demo.et', 'E2E Test Requester', '00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (v_user_id, 'user', '00000000-0000-0000-0000-000000000001')
  ON CONFLICT DO NOTHING;
END $$;