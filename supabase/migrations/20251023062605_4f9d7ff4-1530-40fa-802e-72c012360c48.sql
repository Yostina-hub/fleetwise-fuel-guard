
-- =====================================================
-- FLEET SCHEDULING SYSTEM - Phase 6 & 7 Tables
-- =====================================================

-- Cost Centers Table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Trip Requests Table
CREATE TABLE IF NOT EXISTS public.trip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  pickup_geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  drop_geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  pickup_at TIMESTAMPTZ NOT NULL,
  return_at TIMESTAMPTZ NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  preferred_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  special_requirements TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  sla_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trip Approvals Table
CREATE TABLE IF NOT EXISTS public.trip_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_request_id UUID NOT NULL REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'pending' CHECK (action IN ('pending', 'approve', 'reject', 'escalate')),
  comment TEXT,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_request_id, step)
);

-- Trip Assignments Table
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_request_id UUID NOT NULL REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled')),
  dispatched_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_request_id)
);

-- Vehicle Calendar Table (for availability tracking)
CREATE TABLE IF NOT EXISTS public.vehicle_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  trip_assignment_id UUID REFERENCES public.trip_assignments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver Calendar Table (for availability tracking)
CREATE TABLE IF NOT EXISTS public.driver_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trip_assignment_id UUID REFERENCES public.trip_assignments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_org ON public.trip_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_requester ON public.trip_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON public.trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_pickup_time ON public.trip_requests(pickup_at);

CREATE INDEX IF NOT EXISTS idx_trip_approvals_request ON public.trip_approvals(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_trip_approvals_approver ON public.trip_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_trip_assignments_org ON public.trip_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_vehicle ON public.trip_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_driver ON public.trip_assignments(driver_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_calendar_vehicle_time ON public.vehicle_calendar(vehicle_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_driver_calendar_driver_time ON public.driver_calendar(driver_id, start_time, end_time);

-- Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Cost Centers
CREATE POLICY "Users can view cost centers in their org"
  ON public.cost_centers FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage cost centers"
  ON public.cost_centers FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- RLS Policies for Trip Requests
CREATE POLICY "Users can view trip requests in their org"
  ON public.trip_requests FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create their own trip requests"
  ON public.trip_requests FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization(auth.uid()) AND
    requester_id = auth.uid()
  );

CREATE POLICY "Requesters can update their own draft requests"
  ON public.trip_requests FOR UPDATE
  USING (
    requester_id = auth.uid() AND
    status = 'draft'
  );

CREATE POLICY "Operations managers can manage all trip requests"
  ON public.trip_requests FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager'))
  );

-- RLS Policies for Trip Approvals
CREATE POLICY "Users can view approvals for their org"
  ON public.trip_approvals FOR SELECT
  USING (
    trip_request_id IN (
      SELECT id FROM public.trip_requests
      WHERE organization_id = get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Approvers can act on their assigned approvals"
  ON public.trip_approvals FOR UPDATE
  USING (approver_id = auth.uid());

CREATE POLICY "System can create approvals"
  ON public.trip_approvals FOR INSERT
  WITH CHECK (
    trip_request_id IN (
      SELECT id FROM public.trip_requests
      WHERE organization_id = get_user_organization(auth.uid())
    )
  );

-- RLS Policies for Trip Assignments
CREATE POLICY "Users can view assignments in their org"
  ON public.trip_assignments FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage assignments"
  ON public.trip_assignments FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'dispatcher'))
  );

-- RLS Policies for Vehicle Calendar
CREATE POLICY "Users can view vehicle calendar in their org"
  ON public.vehicle_calendar FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage vehicle calendar"
  ON public.vehicle_calendar FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'dispatcher'))
  );

-- RLS Policies for Driver Calendar
CREATE POLICY "Users can view driver calendar in their org"
  ON public.driver_calendar FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage driver calendar"
  ON public.driver_calendar FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'operations_manager') OR has_role(auth.uid(), 'dispatcher'))
  );

-- Triggers for updated_at
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_requests_updated_at
  BEFORE UPDATE ON public.trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_assignments_updated_at
  BEFORE UPDATE ON public.trip_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
