
CREATE TABLE public.ev_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.ev_charging_stations(id) ON DELETE SET NULL,
  charging_session_id UUID REFERENCES public.ev_charging_sessions(id) ON DELETE SET NULL,

  -- Header
  work_order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  wo_status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'pending',
  work_order_type TEXT, -- charging | maintenance | battery_service | inspection
  shutdown_type TEXT,
  priority TEXT DEFAULT 'medium',
  firm BOOLEAN DEFAULT false,
  planned BOOLEAN DEFAULT false,

  -- Asset
  asset_number TEXT,
  asset_group TEXT,
  asset_activity TEXT,
  wip_accounting_class TEXT DEFAULT 'eAM_Default',

  -- Schedule
  scheduled_start_date TIMESTAMPTZ DEFAULT now(),
  scheduled_completion_date TIMESTAMPTZ,
  duration NUMERIC DEFAULT 0,
  request_number TEXT,

  -- People / org
  planner_id UUID,
  planner_name TEXT,
  description TEXT,
  department TEXT,
  department_description TEXT,
  created_by_user_id UUID,
  assigned_to UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  final_approved_by UUID,
  final_approved_at TIMESTAMPTZ,

  -- Project
  project TEXT,
  task TEXT,
  rebuild_parent TEXT,
  activity_type TEXT,
  activity_cause TEXT,
  activity_source TEXT,

  -- EV-specific
  target_soc_percent NUMERIC(5,2),
  current_soc_percent NUMERIC(5,2),
  energy_required_kwh NUMERIC(10,2),
  energy_delivered_kwh NUMERIC(10,2),
  charging_type TEXT, -- ac | dc_fast | level1 | level2
  connector_type TEXT,
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  cost_per_kwh NUMERIC(10,4),

  -- Materials / permits
  enable_material_issue_request BOOLEAN DEFAULT true,
  warranty_status TEXT,
  warranty_active BOOLEAN DEFAULT false,
  warranty_expiration_date TIMESTAMPTZ,
  tagout_required BOOLEAN DEFAULT false,
  notification_required BOOLEAN DEFAULT false,

  -- Free-form
  context TEXT,
  supplier_name TEXT,
  remark1 TEXT,
  remark2 TEXT,
  remark3 TEXT,
  remark4 TEXT,
  agreement_number TEXT,
  additional_description TEXT,

  -- Failure
  failure_code TEXT,
  failure_cause TEXT,
  resolution TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ev_wo_org ON public.ev_work_orders(organization_id);
CREATE INDEX idx_ev_wo_vehicle ON public.ev_work_orders(vehicle_id);
CREATE INDEX idx_ev_wo_status ON public.ev_work_orders(status);
CREATE INDEX idx_ev_wo_created ON public.ev_work_orders(created_at DESC);
CREATE UNIQUE INDEX idx_ev_wo_number_org ON public.ev_work_orders(organization_id, work_order_number);

ALTER TABLE public.ev_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view ev_work_orders"
  ON public.ev_work_orders FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users can insert ev_work_orders"
  ON public.ev_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users can update ev_work_orders"
  ON public.ev_work_orders FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org users can delete ev_work_orders"
  ON public.ev_work_orders FOR DELETE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE TRIGGER update_ev_work_orders_updated_at
  BEFORE UPDATE ON public.ev_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
