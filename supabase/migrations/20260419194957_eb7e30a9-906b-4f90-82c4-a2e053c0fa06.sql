
-- Fix auto_create_driver_on_role to avoid creating duplicate stub drivers
-- when a driver row was just inserted by the registration form (matched by email).
CREATE OR REPLACE FUNCTION public.auto_create_driver_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_driver_id uuid;
  v_first text;
  v_last text;
  v_org_id uuid;
BEGIN
  -- Only act on driver role assignments
  IF NEW.role::text <> 'driver' THEN
    RETURN NEW;
  END IF;

  -- Look up the user's profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.user_id;
  IF v_profile IS NULL THEN
    RETURN NEW;
  END IF;

  v_org_id := COALESCE(NEW.organization_id, v_profile.organization_id);

  -- 1) Profile already linked to a driver → ensure back-reference and exit
  IF v_profile.linked_driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET user_id = COALESCE(user_id, NEW.user_id), updated_at = now()
    WHERE id = v_profile.linked_driver_id;
    RETURN NEW;
  END IF;

  -- 2) Driver row already exists for this user_id → just link on profile
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = NEW.user_id LIMIT 1;
  IF v_driver_id IS NOT NULL THEN
    UPDATE public.profiles SET linked_driver_id = v_driver_id, updated_at = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- 3) NEW: Driver row already exists for this email/org (e.g. just created by
  --    CreateDriverDialog before the auth user existed) → link it instead of
  --    creating a duplicate stub.
  IF v_profile.email IS NOT NULL THEN
    SELECT id INTO v_driver_id
    FROM public.drivers
    WHERE organization_id = v_org_id
      AND lower(email) = lower(v_profile.email)
      AND user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_driver_id IS NOT NULL THEN
      UPDATE public.drivers
      SET user_id = NEW.user_id, updated_at = now()
      WHERE id = v_driver_id;

      UPDATE public.profiles
      SET linked_driver_id = v_driver_id,
          employee_type = COALESCE(employee_type, 'driver'),
          updated_at = now()
      WHERE id = NEW.user_id;

      RETURN NEW;
    END IF;
  END IF;

  -- 4) Fallback: no existing driver row → create stub (legacy behavior)
  v_first := COALESCE(NULLIF(v_profile.first_name, ''), NULLIF(split_part(COALESCE(v_profile.full_name, v_profile.email), ' ', 1), ''), 'Pending');
  v_last  := COALESCE(NULLIF(v_profile.last_name,  ''), NULLIF(substring(COALESCE(v_profile.full_name, '') FROM position(' ' in COALESCE(v_profile.full_name, '')) + 1), ''), 'Driver');

  INSERT INTO public.drivers (
    organization_id, user_id, first_name, last_name, email, phone,
    license_number, status, avatar_url, notes
  ) VALUES (
    v_org_id, NEW.user_id, v_first, v_last, v_profile.email, v_profile.phone,
    'PENDING-' || substring(NEW.user_id::text from 1 for 8),
    'active', v_profile.avatar_url,
    'Auto-created when driver role was assigned. Please complete license details.'
  )
  RETURNING id INTO v_driver_id;

  UPDATE public.profiles
  SET linked_driver_id = v_driver_id,
      employee_type = COALESCE(employee_type, 'driver'),
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_driver_on_role failed for user %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Clean up the orphan stub from E2E test, and re-link the real driver row to the auth user.
UPDATE public.drivers
SET user_id = 'c8f87bd4-4a82-4df5-b484-93e39ba814fe', updated_at = now()
WHERE id = 'd287118f-38d1-4e59-9ee6-435dcec3a6fe';

UPDATE public.profiles
SET linked_driver_id = 'd287118f-38d1-4e59-9ee6-435dcec3a6fe', updated_at = now()
WHERE id = 'c8f87bd4-4a82-4df5-b484-93e39ba814fe';

DELETE FROM public.drivers WHERE id = 'aae304eb-d4a1-4d11-8341-72792117ef9c';
