-- 1. Extend profiles with HR attributes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS employee_type text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS linked_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_linked_employee ON public.profiles(linked_employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_linked_driver ON public.profiles(linked_driver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_type ON public.profiles(employee_type);

-- 2. Backfill linked_driver_id / linked_employee_id from existing reverse FKs
UPDATE public.profiles p
SET linked_driver_id = d.id
FROM public.drivers d
WHERE d.user_id = p.id AND p.linked_driver_id IS NULL;

UPDATE public.profiles p
SET linked_employee_id = e.id
FROM public.employees e
WHERE e.user_id = p.id AND p.linked_employee_id IS NULL;

-- Backfill first_name/last_name on profiles from full_name where missing
UPDATE public.profiles
SET 
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(substring(full_name FROM position(' ' in full_name) + 1), ''))
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- 3. Trigger: auto-create driver stub when role='driver' is assigned
CREATE OR REPLACE FUNCTION public.auto_create_driver_on_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_driver_id uuid;
  v_first text;
  v_last text;
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

  -- If profile already linked to a driver, ensure driver.user_id also points back
  IF v_profile.linked_driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET user_id = COALESCE(user_id, NEW.user_id), updated_at = now()
    WHERE id = v_profile.linked_driver_id;
    RETURN NEW;
  END IF;

  -- If a driver row already exists for this user_id, just link it on the profile
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = NEW.user_id LIMIT 1;
  IF v_driver_id IS NOT NULL THEN
    UPDATE public.profiles SET linked_driver_id = v_driver_id, updated_at = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Resolve names
  v_first := COALESCE(NULLIF(v_profile.first_name, ''), NULLIF(split_part(COALESCE(v_profile.full_name, v_profile.email), ' ', 1), ''), 'Pending');
  v_last  := COALESCE(NULLIF(v_profile.last_name,  ''), NULLIF(substring(COALESCE(v_profile.full_name, '') FROM position(' ' in COALESCE(v_profile.full_name, '')) + 1), ''), 'Driver');

  -- Create stub driver
  INSERT INTO public.drivers (
    organization_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    license_number,
    status,
    avatar_url,
    notes
  ) VALUES (
    COALESCE(NEW.organization_id, v_profile.organization_id),
    NEW.user_id,
    v_first,
    v_last,
    v_profile.email,
    v_profile.phone,
    'PENDING-' || substring(NEW.user_id::text from 1 for 8),
    'active',
    v_profile.avatar_url,
    'Auto-created when driver role was assigned. Please complete license details.'
  )
  RETURNING id INTO v_driver_id;

  -- Link back on profile
  UPDATE public.profiles
  SET linked_driver_id = v_driver_id,
      employee_type = COALESCE(employee_type, 'driver'),
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block role assignment if driver creation fails (e.g. validation)
  RAISE WARNING 'auto_create_driver_on_role failed for user %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_driver_on_role ON public.user_roles;
CREATE TRIGGER trg_auto_create_driver_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_driver_on_role();

-- 4. Backfill: any existing user with driver role but no driver row gets one now
DO $$
DECLARE
  r RECORD;
  v_first text;
  v_last text;
  v_driver_id uuid;
BEGIN
  FOR r IN
    SELECT ur.user_id, ur.organization_id, p.email, p.full_name, p.first_name, p.last_name, p.phone, p.avatar_url, p.organization_id AS profile_org
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    LEFT JOIN public.drivers d ON d.user_id = ur.user_id
    WHERE ur.role::text = 'driver' AND d.id IS NULL
  LOOP
    v_first := COALESCE(NULLIF(r.first_name, ''), NULLIF(split_part(COALESCE(r.full_name, r.email), ' ', 1), ''), 'Pending');
    v_last  := COALESCE(NULLIF(r.last_name,  ''), NULLIF(substring(COALESCE(r.full_name, '') FROM position(' ' in COALESCE(r.full_name, '')) + 1), ''), 'Driver');

    BEGIN
      INSERT INTO public.drivers (
        organization_id, user_id, first_name, last_name, email, phone,
        license_number, status, avatar_url, notes
      ) VALUES (
        COALESCE(r.organization_id, r.profile_org),
        r.user_id, v_first, v_last, r.email, r.phone,
        'PENDING-' || substring(r.user_id::text from 1 for 8),
        'active', r.avatar_url,
        'Backfilled from existing driver role assignment. Please complete license details.'
      )
      RETURNING id INTO v_driver_id;

      UPDATE public.profiles
      SET linked_driver_id = v_driver_id,
          employee_type = COALESCE(employee_type, 'driver'),
          updated_at = now()
      WHERE id = r.user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Backfill driver failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;
END $$;