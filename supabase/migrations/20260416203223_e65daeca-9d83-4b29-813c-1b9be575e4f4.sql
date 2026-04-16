-- 1. Extend work_orders with Oracle EBS fields
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS asset_group text,
  ADD COLUMN IF NOT EXISTS wip_accounting_class text,
  ADD COLUMN IF NOT EXISTS activity_type text,
  ADD COLUMN IF NOT EXISTS activity_cause text,
  ADD COLUMN IF NOT EXISTS activity_source text,
  ADD COLUMN IF NOT EXISTS schedule_name text,
  ADD COLUMN IF NOT EXISTS planner text,
  ADD COLUMN IF NOT EXISTS shutdown_type text,
  ADD COLUMN IF NOT EXISTS firm_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pm_suggested_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS pm_suggested_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS project_code text,
  ADD COLUMN IF NOT EXISTS task_code text,
  ADD COLUMN IF NOT EXISTS warranty_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_expiration_date date,
  ADD COLUMN IF NOT EXISTS tagout_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS context_value text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS remark_1 text,
  ADD COLUMN IF NOT EXISTS remark_2 text,
  ADD COLUMN IF NOT EXISTS remark_3 text,
  ADD COLUMN IF NOT EXISTS remark_4 text,
  ADD COLUMN IF NOT EXISTS agreement_number text,
  ADD COLUMN IF NOT EXISTS additional_description text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_cause text,
  ADD COLUMN IF NOT EXISTS failure_resolution text,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS por_number text,
  ADD COLUMN IF NOT EXISTS por_status text DEFAULT 'not_initiated',
  ADD COLUMN IF NOT EXISTS por_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS erp_sync_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_user_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_magic_token text,
  ADD COLUMN IF NOT EXISTS supplier_magic_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_order_type text,
  ADD COLUMN IF NOT EXISTS firm_status text DEFAULT 'released';

CREATE INDEX IF NOT EXISTS idx_work_orders_supplier_user ON public.work_orders(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_magic_token ON public.work_orders(supplier_magic_token) WHERE supplier_magic_token IS NOT NULL;

-- 2. Work Order Operations subtable (Oracle "Operations" tab)
CREATE TABLE IF NOT EXISTS public.work_order_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL DEFAULT 10,
  operation_description text NOT NULL,
  department text,
  resource_sequence integer DEFAULT 10,
  resource text,
  required_units integer DEFAULT 1,
  assigned_units integer DEFAULT 0,
  person_or_equipment text,
  start_time timestamptz,
  end_time timestamptz,
  duration_hours numeric(10,2) DEFAULT 0,
  instances_assigned integer DEFAULT 0,
  assigned_hours numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_ops_wo ON public.work_order_operations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_ops_org ON public.work_order_operations(organization_id);

ALTER TABLE public.work_order_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view WO operations"
  ON public.work_order_operations FOR SELECT
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Maintenance team can manage WO operations"
  ON public.work_order_operations FOR ALL
  USING (organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE TRIGGER trg_wo_ops_updated
  BEFORE UPDATE ON public.work_order_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ERP Sync Log
CREATE TABLE IF NOT EXISTS public.erp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  sync_type text NOT NULL DEFAULT 'por_create',
  status text NOT NULL DEFAULT 'pending',
  request_payload jsonb,
  response_payload jsonb,
  response_status_code integer,
  error_message text,
  attempt_number integer DEFAULT 1,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_wo ON public.erp_sync_log(work_order_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_org_status ON public.erp_sync_log(organization_id, status);

ALTER TABLE public.erp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view ERP sync log"
  ON public.erp_sync_log FOR SELECT
  USING (organization_id = public.get_user_organization(auth.uid())
         AND (public.has_role(auth.uid(), 'super_admin'::app_role)
              OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
              OR public.has_role(auth.uid(), 'operations_manager'::app_role)
              OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)));

CREATE POLICY "System can insert ERP sync log"
  ON public.erp_sync_log FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- 4. Add supplier portal access policy to work_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='work_orders'
    AND policyname='Suppliers can view their assigned work orders'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Suppliers can view their assigned work orders"
      ON public.work_orders FOR SELECT
      USING (supplier_user_id = auth.uid())
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='work_orders'
    AND policyname='Suppliers can update progress on their work orders'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Suppliers can update progress on their work orders"
      ON public.work_orders FOR UPDATE
      USING (supplier_user_id = auth.uid())
      WITH CHECK (supplier_user_id = auth.uid())
    $POL$;
  END IF;
END $$;

-- 5. Update auto-PO trigger to ensure ₀-Birr / qty=1 + supplier link
CREATE OR REPLACE FUNCTION public.create_auto_po_from_work_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  po_number TEXT;
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    po_number := 'PO-AUTO-' || EXTRACT(EPOCH FROM now())::bigint::text;

    INSERT INTO public.purchase_orders (
      organization_id, work_order_id, po_number, status,
      total_amount, currency,
      line_items, notes, vendor_id
    ) VALUES (
      NEW.organization_id, NEW.id, po_number, 'approved',
      0, 'ETB',
      jsonb_build_array(jsonb_build_object(
        'description', COALESCE(NEW.service_description, 'Maintenance service per work order'),
        'quantity', 1,
        'unit_price', 0,
        'total', 0,
        'supplier', NEW.supplier_name
      )),
      'Auto-generated zero-Birr / qty=1 PO for approved work order ' || NEW.work_order_number ||
      CASE WHEN NEW.supplier_name IS NOT NULL THEN ' (Supplier: ' || NEW.supplier_name || ')' ELSE '' END,
      NEW.vendor_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. POR auto-initiation trigger: when WO approved, mark POR as 'queued' for ERP push
CREATE OR REPLACE FUNCTION public.queue_por_on_wo_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    NEW.por_status := 'queued';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_queue_por_on_approval ON public.work_orders;
CREATE TRIGGER trg_queue_por_on_approval
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.queue_por_on_wo_approval();