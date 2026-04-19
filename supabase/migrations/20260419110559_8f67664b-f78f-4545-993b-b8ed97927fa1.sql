-- Phase A.2: vendor-scoped supplier assignments + PO auto-creation on WO approval
-- ============================================================================

-- 1) Vendor-scoped supplier assignments (multi-org possible)
CREATE TABLE IF NOT EXISTS public.maintenance_supplier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_user_id uuid NOT NULL,
  vendor_id uuid REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, supplier_user_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_supplier_user ON public.maintenance_supplier_assignments(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_msa_vendor ON public.maintenance_supplier_assignments(vendor_id);

ALTER TABLE public.maintenance_supplier_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msa_org_view" ON public.maintenance_supplier_assignments;
CREATE POLICY "msa_org_view" ON public.maintenance_supplier_assignments
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR supplier_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "msa_org_manage" ON public.maintenance_supplier_assignments;
CREATE POLICY "msa_org_manage" ON public.maintenance_supplier_assignments
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- 2) Allow supplier users to read their assigned work_orders (via assignments OR supplier_user_id)
DROP POLICY IF EXISTS "wo_supplier_view_assigned" ON public.work_orders;
CREATE POLICY "wo_supplier_view_assigned" ON public.work_orders
  FOR SELECT TO authenticated
  USING (
    supplier_user_id = auth.uid()
    OR vendor_id IN (
      SELECT vendor_id FROM public.maintenance_supplier_assignments
      WHERE supplier_user_id = auth.uid() AND is_active = true
    )
  );

-- Allow supplier to update limited fields (status notes via app code only). RLS allows update on their WOs:
DROP POLICY IF EXISTS "wo_supplier_update_assigned" ON public.work_orders;
CREATE POLICY "wo_supplier_update_assigned" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (
    supplier_user_id = auth.uid()
    OR vendor_id IN (
      SELECT vendor_id FROM public.maintenance_supplier_assignments
      WHERE supplier_user_id = auth.uid() AND is_active = true
    )
  );

-- 3) Supplier RLS for messages & payment requests on their own WOs
DROP POLICY IF EXISTS "wo_msgs_supplier_select" ON public.wo_supplier_messages;
CREATE POLICY "wo_msgs_supplier_select" ON public.wo_supplier_messages
  FOR SELECT TO authenticated
  USING (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE supplier_user_id = auth.uid()
        OR vendor_id IN (
          SELECT vendor_id FROM public.maintenance_supplier_assignments
          WHERE supplier_user_id = auth.uid() AND is_active = true
        )
    )
  );

DROP POLICY IF EXISTS "wo_msgs_supplier_insert" ON public.wo_supplier_messages;
CREATE POLICY "wo_msgs_supplier_insert" ON public.wo_supplier_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'supplier'
    AND sender_id = auth.uid()
    AND work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE supplier_user_id = auth.uid()
        OR vendor_id IN (
          SELECT vendor_id FROM public.maintenance_supplier_assignments
          WHERE supplier_user_id = auth.uid() AND is_active = true
        )
    )
  );

DROP POLICY IF EXISTS "spr_supplier_select" ON public.supplier_payment_requests;
CREATE POLICY "spr_supplier_select" ON public.supplier_payment_requests
  FOR SELECT TO authenticated
  USING (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE supplier_user_id = auth.uid()
        OR vendor_id IN (
          SELECT vendor_id FROM public.maintenance_supplier_assignments
          WHERE supplier_user_id = auth.uid() AND is_active = true
        )
    )
  );

DROP POLICY IF EXISTS "spr_supplier_insert" ON public.supplier_payment_requests;
CREATE POLICY "spr_supplier_insert" ON public.supplier_payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE supplier_user_id = auth.uid()
        OR vendor_id IN (
          SELECT vendor_id FROM public.maintenance_supplier_assignments
          WHERE supplier_user_id = auth.uid() AND is_active = true
        )
    )
  );

-- 4) Auto-create zero-birr / qty-1 PO when a Work Order is approved (Step 1.6)
CREATE OR REPLACE FUNCTION public.fn_wo_approved_create_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_number text;
  v_existing_po_id uuid;
BEGIN
  -- Only fire when approval_status flips to 'approved'
  IF (TG_OP = 'UPDATE'
      AND NEW.approval_status = 'approved'
      AND COALESCE(OLD.approval_status, '') <> 'approved') THEN

    -- Skip if a PO already exists for this WO
    SELECT id INTO v_existing_po_id FROM public.purchase_orders WHERE work_order_id = NEW.id LIMIT 1;
    IF v_existing_po_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    v_po_number := 'PO-AUTO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO public.purchase_orders (
      organization_id, po_number, supplier_id, work_order_id,
      status, priority, line_items, subtotal, total_amount, currency,
      notes, created_by
    ) VALUES (
      NEW.organization_id,
      v_po_number,
      NEW.vendor_id,
      NEW.id,
      'draft',
      COALESCE(NEW.priority, 'normal'),
      jsonb_build_array(jsonb_build_object(
        'description', COALESCE(NEW.service_description, 'Auto-generated for work order'),
        'quantity', 1,
        'unit_price', 0,
        'total', 0
      )),
      0, 0, 'ETB',
      'Auto-generated zero-birr PO from approved work order ' || NEW.work_order_number,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wo_approved_create_po ON public.work_orders;
CREATE TRIGGER trg_wo_approved_create_po
  AFTER UPDATE OF approval_status ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_wo_approved_create_po();

-- 5) updated_at trigger for new table
DROP TRIGGER IF EXISTS trg_msa_updated_at ON public.maintenance_supplier_assignments;
CREATE TRIGGER trg_msa_updated_at
  BEFORE UPDATE ON public.maintenance_supplier_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
