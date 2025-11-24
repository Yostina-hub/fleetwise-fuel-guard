-- Fix handle_new_user to properly set organization_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Ensure default organization exists
  INSERT INTO public.organizations (id, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO default_org_id;
  
  -- Get the org id if it already existed
  IF default_org_id IS NULL THEN
    SELECT id INTO default_org_id FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
  
  -- Create profile with organization_id
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_org_id
  );
  
  -- If this is the demo account, assign super_admin role
  IF NEW.email = 'demo@gmail.et' THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'super_admin', default_org_id)
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remove the separate demo account trigger since it's now integrated
DROP TRIGGER IF EXISTS on_demo_account_created ON public.profiles;