-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'fleet_owner',
  'operations_manager',
  'dispatcher',
  'maintenance_lead',
  'fuel_controller',
  'driver',
  'auditor'
);

-- Create organizations table (multi-tenant support)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create business units table
CREATE TABLE public.business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Create depots table
CREATE TABLE public.depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (CRITICAL: Separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_unit_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
  depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, organization_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.name = _permission_name
  )
$$;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (id = public.get_user_organization(auth.uid()));

CREATE POLICY "Super admins can manage all organizations"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for business_units
CREATE POLICY "Users can view business units in their organization"
  ON public.business_units
  FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage business units"
  ON public.business_units
  FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- RLS Policies for depots
CREATE POLICY "Users can view depots in their organization"
  ON public.depots
  FOR SELECT
  TO authenticated
  USING (
    business_unit_id IN (
      SELECT id FROM public.business_units
      WHERE organization_id = public.get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Operations managers can manage depots"
  ON public.depots
  FOR ALL
  TO authenticated
  USING (
    business_unit_id IN (
      SELECT id FROM public.business_units
      WHERE organization_id = public.get_user_organization(auth.uid())
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for permissions
CREATE POLICY "All authenticated users can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super admins can manage permissions"
  ON public.permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for role_permissions
CREATE POLICY "All authenticated users can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super admins can manage role permissions"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert default permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
  ('view_dashboard', 'View dashboard and analytics', 'dashboard', 'read'),
  ('view_map', 'View live tracking map', 'map', 'read'),
  ('view_fleet', 'View fleet vehicles', 'fleet', 'read'),
  ('manage_fleet', 'Add, edit, delete vehicles', 'fleet', 'write'),
  ('view_fuel', 'View fuel monitoring data', 'fuel', 'read'),
  ('manage_fuel', 'Edit fuel settings and thresholds', 'fuel', 'write'),
  ('view_alerts', 'View alerts', 'alerts', 'read'),
  ('acknowledge_alerts', 'Acknowledge and resolve alerts', 'alerts', 'write'),
  ('view_maintenance', 'View maintenance schedules', 'maintenance', 'read'),
  ('manage_maintenance', 'Create and manage work orders', 'maintenance', 'write'),
  ('view_reports', 'View and generate reports', 'reports', 'read'),
  ('export_reports', 'Export reports to PDF/Excel', 'reports', 'export'),
  ('manage_users', 'Add, edit, remove users', 'users', 'write'),
  ('manage_roles', 'Assign roles to users', 'roles', 'write'),
  ('manage_settings', 'Change system settings', 'settings', 'write'),
  ('view_drivers', 'View driver information', 'drivers', 'read'),
  ('manage_drivers', 'Manage driver profiles', 'drivers', 'write'),
  ('device_operations', 'Send commands to devices', 'devices', 'write');

-- Assign permissions to roles
-- Super Admin - Full access
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions;

-- Fleet Owner / CFO
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fleet_owner', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_map', 'view_fleet', 'view_fuel',
  'view_alerts', 'view_maintenance', 'view_reports', 'export_reports'
);

-- Operations Manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'operations_manager', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_map', 'view_fleet', 'manage_fleet',
  'view_fuel', 'view_alerts', 'acknowledge_alerts',
  'view_maintenance', 'manage_maintenance', 'view_reports',
  'export_reports', 'view_drivers', 'manage_drivers', 'device_operations'
);

-- Dispatcher
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'dispatcher', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_map', 'view_fleet', 'view_alerts',
  'acknowledge_alerts', 'view_drivers', 'device_operations'
);

-- Maintenance Lead
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'maintenance_lead', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_fleet', 'view_maintenance',
  'manage_maintenance', 'view_reports'
);

-- Fuel Controller
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'fuel_controller', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_fleet', 'view_fuel', 'manage_fuel',
  'view_alerts', 'acknowledge_alerts', 'view_reports', 'export_reports'
);

-- Driver
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'driver', id FROM public.permissions
WHERE name IN ('view_map', 'view_alerts');

-- Auditor (read-only)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'auditor', id FROM public.permissions
WHERE name IN (
  'view_dashboard', 'view_map', 'view_fleet', 'view_fuel',
  'view_alerts', 'view_maintenance', 'view_reports', 'export_reports'
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_units_updated_at
  BEFORE UPDATE ON public.business_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_depots_updated_at
  BEFORE UPDATE ON public.depots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();