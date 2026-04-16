
-- 1. maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  request_number TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'preventive',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  km_reading NUMERIC,
  running_hours NUMERIC,
  fuel_level NUMERIC,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  requestor_department TEXT,
  description TEXT,
  rejection_reason TEXT,
  notes TEXT,
  work_order_id UUID REFERENCES public.work_orders(id),
  schedule_id UUID REFERENCES public.maintenance_schedules(id),
  approved_at TIMESTAMPTZ,
  requested_completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_requests_select" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "maintenance_requests_insert" ON public.maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "maintenance_requests_update" ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "maintenance_requests_delete" ON public.maintenance_requests
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. wo_supplier_messages table
CREATE TABLE public.wo_supplier_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  sender_type TEXT NOT NULL DEFAULT 'fleet_team',
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wo_supplier_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_supplier_messages_select" ON public.wo_supplier_messages
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "wo_supplier_messages_insert" ON public.wo_supplier_messages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 3. post_maintenance_inspections table
CREATE TABLE public.post_maintenance_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  inspector_id UUID,
  inspector_name TEXT,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_result TEXT DEFAULT 'pending',
  checklist JSONB DEFAULT '[]'::jsonb,
  findings TEXT,
  corrective_actions TEXT,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  scrap_returned BOOLEAN DEFAULT false,
  scrap_form_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_maintenance_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_maintenance_inspections_select" ON public.post_maintenance_inspections
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "post_maintenance_inspections_insert" ON public.post_maintenance_inspections
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "post_maintenance_inspections_update" ON public.post_maintenance_inspections
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_post_maintenance_inspections_updated_at
  BEFORE UPDATE ON public.post_maintenance_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. supplier_payment_requests table
CREATE TABLE public.supplier_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  supplier_id UUID REFERENCES public.supplier_profiles(id),
  supplier_name TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_payment_requests_select" ON public.supplier_payment_requests
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "supplier_payment_requests_insert" ON public.supplier_payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "supplier_payment_requests_update" ON public.supplier_payment_requests
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_supplier_payment_requests_updated_at
  BEFORE UPDATE ON public.supplier_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger: Auto-create work order when maintenance request is approved
CREATE OR REPLACE FUNCTION public.create_wo_from_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  wo_id UUID;
  wo_number TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    wo_number := 'WO-MR-' || EXTRACT(EPOCH FROM now())::bigint::text;
    
    INSERT INTO public.work_orders (
      organization_id, vehicle_id, work_order_number, work_type,
      priority, service_description, status, scheduled_date,
      maintenance_schedule_id, notes
    ) VALUES (
      NEW.organization_id, NEW.vehicle_id, wo_number,
      NEW.request_type,
      COALESCE(NEW.priority, 'medium'),
      COALESCE(NEW.description, 'Maintenance request: ' || NEW.request_number),
      'pending',
      COALESCE(NEW.requested_completion_date, CURRENT_DATE),
      NEW.schedule_id,
      'Auto-created from maintenance request ' || NEW.request_number
    ) RETURNING id INTO wo_id;

    NEW.work_order_id := wo_id;
    NEW.status := 'work_order_created';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_wo_from_maintenance_request
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_wo_from_maintenance_request();

-- 6. Trigger: Auto-create zero-birr PO when work order is approved
CREATE OR REPLACE FUNCTION public.create_auto_po_from_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  po_number TEXT;
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    po_number := 'PO-AUTO-' || EXTRACT(EPOCH FROM now())::bigint::text;
    
    INSERT INTO public.purchase_orders (
      organization_id, work_order_id, po_number, status,
      total_amount, currency,
      line_items, notes
    ) VALUES (
      NEW.organization_id, NEW.id, po_number, 'approved',
      0, 'ETB',
      '[{"description": "Maintenance service as per work order", "quantity": 1, "unit_price": 0, "total": 0}]'::jsonb,
      'Auto-generated PO for approved work order ' || NEW.work_order_number
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_auto_po_from_work_order
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.create_auto_po_from_work_order();

-- Enable realtime for supplier messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.wo_supplier_messages;
