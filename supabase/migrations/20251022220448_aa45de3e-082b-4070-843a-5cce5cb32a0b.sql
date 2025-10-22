-- Function to automatically assign super_admin role to the first user in an organization
CREATE OR REPLACE FUNCTION public.assign_first_user_as_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user in the system (no other profiles exist)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id != NEW.id LIMIT 1) THEN
    -- Create a default organization if none exists
    INSERT INTO public.organizations (id, name)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
    ON CONFLICT (id) DO NOTHING;
    
    -- Link the user to the default organization
    UPDATE public.profiles
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE id = NEW.id;
    
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'super_admin', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
    
    -- Also assign fleet_owner role for full access
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'fleet_owner', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign roles to first user
DROP TRIGGER IF EXISTS auto_assign_first_user_roles ON public.profiles;
CREATE TRIGGER auto_assign_first_user_roles
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_user_as_super_admin();

-- For existing users without organization, assign them to default org with super_admin role
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Ensure default organization exists
  INSERT INTO public.organizations (id, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
  ON CONFLICT (id) DO NOTHING;
  
  -- Update all profiles without organization
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE organization_id IS NULL
  LOOP
    -- Link to default organization
    UPDATE public.profiles
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE id = user_record.id;
    
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (user_record.id, 'super_admin', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
    
    -- Also assign fleet_owner role
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (user_record.id, 'fleet_owner', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
  END LOOP;
END $$;