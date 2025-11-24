-- Function to assign demo account super admin role
CREATE OR REPLACE FUNCTION public.assign_demo_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the demo account
  IF NEW.email = 'demo@gmail.et' THEN
    -- Ensure default organization exists
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for demo account
DROP TRIGGER IF EXISTS on_demo_account_created ON public.profiles;
CREATE TRIGGER on_demo_account_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_demo_super_admin();