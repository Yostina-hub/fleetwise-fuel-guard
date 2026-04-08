
-- 1. Driver Incidents
CREATE TABLE public.driver_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL DEFAULT 'accident' CHECK (incident_type IN ('accident', 'near_miss', 'traffic_violation', 'cargo_damage', 'road_hazard', 'mechanical_failure', 'other')),
  incident_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  description TEXT NOT NULL,
  injuries BOOLEAN NOT NULL DEFAULT false,
  injury_details TEXT,
  property_damage BOOLEAN NOT NULL DEFAULT false,
  damage_estimate_cost NUMERIC(12,2),
  police_report_number TEXT,
  insurance_claim_number TEXT,
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'under_investigation', 'resolved', 'closed', 'appealed')),
  fault_determination TEXT CHECK (fault_determination IN ('driver_at_fault', 'other_party', 'shared', 'no_fault', 'undetermined')),
  evidence_urls TEXT[],
  witnesses JSONB,
  resolution_notes TEXT,
  reported_by UUID,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incidents in their org"
  ON public.driver_incidents FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage incidents"
  ON public.driver_incidents FOR ALL TO authenticated
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

CREATE INDEX idx_drv_incidents_driver ON public.driver_incidents(driver_id);
CREATE INDEX idx_drv_incidents_org ON public.driver_incidents(organization_id);
CREATE INDEX idx_drv_incidents_status ON public.driver_incidents(status);
CREATE INDEX idx_drv_incidents_date ON public.driver_incidents(incident_date DESC);

CREATE TRIGGER update_driver_incidents_updated_at
  BEFORE UPDATE ON public.driver_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. DVIR Reports
CREATE TABLE public.driver_dvir_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL DEFAULT 'pre_trip' CHECK (inspection_type IN ('pre_trip', 'post_trip', 'en_route', 'periodic')),
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  odometer_reading NUMERIC(10,1),
  items_inspected JSONB NOT NULL DEFAULT '[]'::jsonb,
  defects_found JSONB DEFAULT '[]'::jsonb,
  defect_count INTEGER NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'pass' CHECK (overall_status IN ('pass', 'fail', 'conditional')),
  certified_safe BOOLEAN NOT NULL DEFAULT true,
  driver_signature TEXT,
  mechanic_review_status TEXT DEFAULT 'pending' CHECK (mechanic_review_status IN ('pending', 'reviewed', 'repairs_scheduled', 'repairs_completed', 'not_required')),
  mechanic_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_dvir_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DVIR in their org"
  ON public.driver_dvir_reports FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage DVIR"
  ON public.driver_dvir_reports FOR ALL TO authenticated
  USING (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'technician')
    )) OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (organization_id = get_user_organization(auth.uid()) AND (
      has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'fleet_manager') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'technician')
    )) OR is_super_admin(auth.uid())
  );

CREATE INDEX idx_dvir_rpt_driver ON public.driver_dvir_reports(driver_id);
CREATE INDEX idx_dvir_rpt_vehicle ON public.driver_dvir_reports(vehicle_id);
CREATE INDEX idx_dvir_rpt_org ON public.driver_dvir_reports(organization_id);
CREATE INDEX idx_dvir_rpt_date ON public.driver_dvir_reports(inspection_date DESC);

CREATE TRIGGER update_driver_dvir_reports_updated_at
  BEFORE UPDATE ON public.driver_dvir_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Driver Messages
CREATE TABLE public.driver_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id UUID,
  recipient_driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'direct' CHECK (message_type IN ('announcement', 'direct', 'alert', 'broadcast', 'safety_notice')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  parent_message_id UUID REFERENCES public.driver_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their org"
  ON public.driver_messages FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage messages"
  ON public.driver_messages FOR ALL TO authenticated
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

CREATE INDEX idx_drv_msg_org ON public.driver_messages(organization_id);
CREATE INDEX idx_drv_msg_recipient ON public.driver_messages(recipient_driver_id);
CREATE INDEX idx_drv_msg_sender ON public.driver_messages(sender_id);
CREATE INDEX idx_drv_msg_date ON public.driver_messages(created_at DESC);

CREATE TRIGGER update_driver_messages_updated_at
  BEFORE UPDATE ON public.driver_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_messages;
