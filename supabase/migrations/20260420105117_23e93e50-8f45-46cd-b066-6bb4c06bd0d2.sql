-- ===========================================================================
-- Batch 1+2: RBAC permissions expansion + Driver schema enhancements
-- ===========================================================================

-- ----- Batch 1: Seed missing permissions -----
INSERT INTO public.permissions (resource, action, name, description) VALUES
  ('drivers', 'create',  'drivers.create',  'Create new drivers'),
  ('drivers', 'edit',    'drivers.edit',    'Edit existing drivers'),
  ('drivers', 'delete',  'drivers.delete',  'Delete drivers'),
  ('drivers', 'approve', 'drivers.approve', 'Approve driver registrations / changes'),
  ('drivers', 'reject',  'drivers.reject',  'Reject driver registrations / changes'),
  ('drivers', 'assign',  'drivers.assign',  'Assign drivers to vehicles / pools'),
  ('drivers', 'export',  'drivers.export',  'Export driver lists'),
  ('drivers', 'import',  'drivers.import',  'Bulk-import drivers'),
  ('drivers', 'archive', 'drivers.archive', 'Archive / unarchive drivers'),
  ('fleet', 'create',  'fleet.create',  'Create new vehicles'),
  ('fleet', 'edit',    'fleet.edit',    'Edit existing vehicles'),
  ('fleet', 'delete',  'fleet.delete',  'Delete vehicles'),
  ('fleet', 'approve', 'fleet.approve', 'Approve fleet changes'),
  ('fleet', 'reject',  'fleet.reject',  'Reject fleet changes'),
  ('fleet', 'assign',  'fleet.assign',  'Assign vehicles to drivers / pools'),
  ('fleet', 'export',  'fleet.export',  'Export fleet lists'),
  ('fleet', 'import',  'fleet.import',  'Bulk-import vehicles'),
  ('fleet', 'archive', 'fleet.archive', 'Archive / unarchive vehicles'),
  ('fuel', 'create',  'fuel.create',  'Create fuel records / requests'),
  ('fuel', 'edit',    'fuel.edit',    'Edit fuel records'),
  ('fuel', 'delete',  'fuel.delete',  'Delete fuel records'),
  ('fuel', 'approve', 'fuel.approve', 'Approve fuel requests'),
  ('fuel', 'reject',  'fuel.reject',  'Reject fuel requests'),
  ('fuel', 'export',  'fuel.export',  'Export fuel reports'),
  ('fuel', 'archive', 'fuel.archive', 'Archive fuel records'),
  ('maintenance', 'create',  'maintenance.create',  'Create maintenance records'),
  ('maintenance', 'edit',    'maintenance.edit',    'Edit maintenance records'),
  ('maintenance', 'delete',  'maintenance.delete',  'Delete maintenance records'),
  ('maintenance', 'approve', 'maintenance.approve', 'Approve maintenance work orders'),
  ('maintenance', 'reject',  'maintenance.reject',  'Reject maintenance work orders'),
  ('maintenance', 'assign',  'maintenance.assign',  'Assign work orders to technicians'),
  ('maintenance', 'export',  'maintenance.export',  'Export maintenance reports'),
  ('maintenance', 'archive', 'maintenance.archive', 'Archive maintenance records'),
  ('alerts', 'create',  'alerts.create',  'Create alert rules'),
  ('alerts', 'edit',    'alerts.edit',    'Edit alert rules'),
  ('alerts', 'delete',  'alerts.delete',  'Delete alert rules'),
  ('alerts', 'approve', 'alerts.approve', 'Acknowledge / resolve alerts'),
  ('alerts', 'export',  'alerts.export',  'Export alert history'),
  ('alerts', 'archive', 'alerts.archive', 'Archive alerts'),
  ('reports', 'create',  'reports.create',  'Create new reports'),
  ('reports', 'edit',    'reports.edit',    'Edit report definitions'),
  ('reports', 'delete',  'reports.delete',  'Delete reports'),
  ('reports', 'archive', 'reports.archive', 'Archive reports'),
  ('users', 'read',    'users.read',    'View users list'),
  ('users', 'create',  'users.create',  'Invite / create users'),
  ('users', 'edit',    'users.edit',    'Edit user profiles'),
  ('users', 'delete',  'users.delete',  'Deactivate / delete users'),
  ('users', 'approve', 'users.approve', 'Approve user access requests'),
  ('users', 'reject',  'users.reject',  'Reject user access requests'),
  ('users', 'export',  'users.export',  'Export user lists'),
  ('users', 'import',  'users.import',  'Bulk-import users'),
  ('users', 'archive', 'users.archive', 'Archive users'),
  ('trips', 'read',    'trips.read',    'View trips'),
  ('trips', 'create',  'trips.create',  'Create trips'),
  ('trips', 'edit',    'trips.edit',    'Edit trips'),
  ('trips', 'delete',  'trips.delete',  'Delete trips'),
  ('trips', 'approve', 'trips.approve', 'Approve trip plans'),
  ('trips', 'reject',  'trips.reject',  'Reject trip plans'),
  ('trips', 'assign',  'trips.assign',  'Assign drivers / vehicles to trips'),
  ('trips', 'export',  'trips.export',  'Export trip data'),
  ('trips', 'archive', 'trips.archive', 'Archive trips'),
  ('vehicle_requests', 'read',    'vehicle_requests.read',    'View vehicle requests'),
  ('vehicle_requests', 'create',  'vehicle_requests.create',  'Submit vehicle requests'),
  ('vehicle_requests', 'edit',    'vehicle_requests.edit',    'Edit vehicle requests'),
  ('vehicle_requests', 'delete',  'vehicle_requests.delete',  'Delete vehicle requests'),
  ('vehicle_requests', 'approve', 'vehicle_requests.approve', 'Approve vehicle requests'),
  ('vehicle_requests', 'reject',  'vehicle_requests.reject',  'Reject vehicle requests'),
  ('vehicle_requests', 'assign',  'vehicle_requests.assign',  'Assign vehicle / driver to requests'),
  ('vehicle_requests', 'export',  'vehicle_requests.export',  'Export request history'),
  ('vehicle_requests', 'archive', 'vehicle_requests.archive', 'Archive vehicle requests'),
  ('fuel_requests', 'read',    'fuel_requests.read',    'View fuel requests'),
  ('fuel_requests', 'create',  'fuel_requests.create',  'Submit fuel requests'),
  ('fuel_requests', 'edit',    'fuel_requests.edit',    'Edit fuel requests'),
  ('fuel_requests', 'delete',  'fuel_requests.delete',  'Delete fuel requests'),
  ('fuel_requests', 'approve', 'fuel_requests.approve', 'Approve fuel requests'),
  ('fuel_requests', 'reject',  'fuel_requests.reject',  'Reject fuel requests'),
  ('fuel_requests', 'export',  'fuel_requests.export',  'Export fuel requests'),
  ('fuel_requests', 'archive', 'fuel_requests.archive', 'Archive fuel requests'),
  ('dashboard', 'export', 'dashboard.export', 'Export dashboard data')
ON CONFLICT (name) DO NOTHING;

-- ----- Batch 2: Driver schema additions -----
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS assigned_pool TEXT,
  ADD COLUMN IF NOT EXISTS telebirr_account TEXT;

COMMENT ON COLUMN public.drivers.assigned_pool IS
  'Operational pool assignment (replaces legacy route_type for semantic clarity)';
COMMENT ON COLUMN public.drivers.telebirr_account IS
  'Optional Telebirr mobile money account (9–10 digits)';

ALTER TABLE public.drivers ALTER COLUMN driver_type DROP DEFAULT;

COMMENT ON COLUMN public.drivers.bank_name IS 'DEPRECATED: hidden from UI. Use telebirr_account.';
COMMENT ON COLUMN public.drivers.bank_account IS 'DEPRECATED: hidden from UI. Use telebirr_account.';

-- License category validity table for dynamic expiry computation
CREATE TABLE IF NOT EXISTS public.license_category_validity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  valid_years INTEGER NOT NULL DEFAULT 5 CHECK (valid_years > 0 AND valid_years <= 50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category)
);

ALTER TABLE public.license_category_validity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "License validity readable in org" ON public.license_category_validity;
CREATE POLICY "License validity readable in org"
  ON public.license_category_validity FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

DROP POLICY IF EXISTS "License validity managed by admins" ON public.license_category_validity;
CREATE POLICY "License validity managed by admins"
  ON public.license_category_validity FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
  );

DROP TRIGGER IF EXISTS trg_license_category_validity_updated_at ON public.license_category_validity;
CREATE TRIGGER trg_license_category_validity_updated_at
  BEFORE UPDATE ON public.license_category_validity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.license_category_validity (organization_id, category, valid_years, notes)
SELECT o.id, v.category, v.valid_years, v.notes
FROM public.organizations o
CROSS JOIN (VALUES
  ('1',        5, 'Automobile / private'),
  ('2',        5, 'Light commercial'),
  ('3',        5, 'Heavy commercial'),
  ('4',        3, 'Heavy haulage'),
  ('5',        3, 'Specialised'),
  ('Public-1', 3, 'Public taxi / minibus'),
  ('Public-2', 3, 'Public midi-bus'),
  ('Public-3', 3, 'Public bus / coach')
) AS v(category, valid_years, notes)
ON CONFLICT (organization_id, category) DO NOTHING;
