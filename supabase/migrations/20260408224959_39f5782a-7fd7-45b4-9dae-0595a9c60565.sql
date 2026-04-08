
-- 1. Driver Onboarding Checklists
CREATE TABLE public.driver_onboarding_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL DEFAULT 'onboarding' CHECK (checklist_type IN ('onboarding', 'offboarding')),
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view onboarding checklists in their org"
  ON public.driver_onboarding_checklists FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage onboarding checklists"
  ON public.driver_onboarding_checklists FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_onboarding_driver ON public.driver_onboarding_checklists(driver_id);
CREATE INDEX idx_onboarding_org ON public.driver_onboarding_checklists(organization_id);

CREATE TRIGGER update_driver_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.driver_onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Driver Availability
CREATE TABLE public.driver_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'off_duty' CHECK (status IN ('on_duty', 'off_duty', 'on_leave', 'sick', 'training', 'suspended', 'available')),
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id)
);

ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view availability in their org"
  ON public.driver_availability FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage availability"
  ON public.driver_availability FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_availability_org ON public.driver_availability(organization_id);
CREATE INDEX idx_availability_status ON public.driver_availability(status);

CREATE TRIGGER update_driver_availability_updated_at
  BEFORE UPDATE ON public.driver_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for availability board
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_availability;

-- 3. Driver Groups (Hierarchy)
CREATE TABLE public.driver_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'team' CHECK (group_type IN ('region', 'depot', 'department', 'team', 'shift')),
  parent_group_id UUID REFERENCES public.driver_groups(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups in their org"
  ON public.driver_groups FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage groups"
  ON public.driver_groups FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_driver_groups_org ON public.driver_groups(organization_id);
CREATE INDEX idx_driver_groups_parent ON public.driver_groups(parent_group_id);

CREATE TRIGGER update_driver_groups_updated_at
  BEFORE UPDATE ON public.driver_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Driver Group Members
CREATE TABLE public.driver_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.driver_groups(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, driver_id)
);

ALTER TABLE public.driver_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group members in their org"
  ON public.driver_group_members FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage group members"
  ON public.driver_group_members FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_group_members_group ON public.driver_group_members(group_id);
CREATE INDEX idx_group_members_driver ON public.driver_group_members(driver_id);

-- 5. Driver Vehicle Assignment History
CREATE TABLE public.driver_vehicle_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  assigned_by UUID,
  unassigned_by UUID,
  reason TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicle assignments in their org"
  ON public.driver_vehicle_assignments FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage vehicle assignments"
  ON public.driver_vehicle_assignments FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_vehicle_assignments_driver ON public.driver_vehicle_assignments(driver_id);
CREATE INDEX idx_vehicle_assignments_vehicle ON public.driver_vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_current ON public.driver_vehicle_assignments(is_current) WHERE is_current = true;

CREATE TRIGGER update_driver_vehicle_assignments_updated_at
  BEFORE UPDATE ON public.driver_vehicle_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Driver License/Cert Expiry Alerts
CREATE TABLE public.driver_license_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'license_expiry' CHECK (alert_type IN ('license_expiry', 'medical_cert_expiry', 'training_cert_expiry', 'document_expiry')),
  document_type TEXT,
  expiry_date DATE NOT NULL,
  days_until_expiry INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'acknowledged', 'resolved', 'expired')),
  notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_license_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view license alerts in their org"
  ON public.driver_license_alerts FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage license alerts"
  ON public.driver_license_alerts FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_license_alerts_driver ON public.driver_license_alerts(driver_id);
CREATE INDEX idx_license_alerts_status ON public.driver_license_alerts(status);
CREATE INDEX idx_license_alerts_expiry ON public.driver_license_alerts(expiry_date);

CREATE TRIGGER update_driver_license_alerts_updated_at
  BEFORE UPDATE ON public.driver_license_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
