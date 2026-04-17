-- =============================================================
-- 1) Vehicle Inspections — capture annual registration data
-- =============================================================
ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS registration_cost numeric,
  ADD COLUMN IF NOT EXISTS registration_date date,
  ADD COLUMN IF NOT EXISTS registration_valid_until date,
  ADD COLUMN IF NOT EXISTS inspection_center text,
  ADD COLUMN IF NOT EXISTS inspection_center_supplier_id uuid,
  ADD COLUMN IF NOT EXISTS bolo_certificate_url text,
  ADD COLUMN IF NOT EXISTS official_receipt_url text,
  ADD COLUMN IF NOT EXISTS plate_sticker_number text,
  ADD COLUMN IF NOT EXISTS outsource_stage text,
  ADD COLUMN IF NOT EXISTS outsource_po_id uuid,
  ADD COLUMN IF NOT EXISTS work_order_id uuid,
  ADD COLUMN IF NOT EXISTS maintenance_request_id uuid,
  ADD COLUMN IF NOT EXISTS closed_by_initiator_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by_initiator uuid;

-- =============================================================
-- 2) Maintenance Requests — link inspection + approver context
-- =============================================================
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS inspection_id uuid,
  ADD COLUMN IF NOT EXISTS approver_role text,
  ADD COLUMN IF NOT EXISTS approver_user_id uuid,
  ADD COLUMN IF NOT EXISTS approval_routed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- =============================================================
-- 3) Auto-route approver via delegation/authority matrix
-- =============================================================
CREATE OR REPLACE FUNCTION public.route_request_to_approver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_delegate_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.approver_role IS NULL OR NEW.approver_role = '') THEN
    -- 1) Try authority matrix (cost-aware), priority order
    SELECT approver_role INTO v_role
    FROM public.authority_matrix
    WHERE organization_id = NEW.organization_id
      AND is_active = true
      AND scope IN ('maintenance','inspection','all')
    ORDER BY priority ASC, step_order ASC
    LIMIT 1;

    -- 2) Fallback default by request subtype
    IF v_role IS NULL THEN
      v_role := CASE
        WHEN NEW.request_subtype = 'annual' THEN 'fleet_manager'
        WHEN NEW.request_subtype IN ('pre_trip','post_trip') THEN 'maintenance_supervisor'
        ELSE 'maintenance_manager'
      END;
    END IF;

    NEW.approver_role := v_role;
    NEW.assigned_to_role := v_role;

    -- 3) Resolve active delegation, if any
    SELECT delegate_id INTO v_delegate_id
    FROM public.delegation_matrix
    WHERE organization_id = NEW.organization_id
      AND is_active = true
      AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until >= now())
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_delegate_id IS NOT NULL THEN
      NEW.approver_user_id := v_delegate_id;
    END IF;

    NEW.approval_routed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_request_to_approver ON public.maintenance_requests;
CREATE TRIGGER trg_route_request_to_approver
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.route_request_to_approver();

-- =============================================================
-- 4) Auto-create work order on approval
-- =============================================================
CREATE OR REPLACE FUNCTION public.auto_create_work_order_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo_id uuid;
  v_wo_number text;
  v_is_inspection boolean;
  v_is_annual boolean;
BEGIN
  v_is_inspection := (NEW.request_type = 'inspection');
  v_is_annual    := (NEW.request_subtype = 'annual');

  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.work_order_id IS NULL THEN
    v_wo_number := 'WO-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

    INSERT INTO public.work_orders (
      organization_id, vehicle_id, work_order_number, work_type, priority,
      service_description, service_category, status,
      request_type, requested_for, request_start_date, request_completion_date,
      km_reading, driver_type, driver_name, driver_phone, fuel_level,
      remark, additional_description, context_value, asset_criticality,
      created_by_user_id, created_by_name, created_by_email, created_by_phone,
      contact_preference, notify_user, supplier_name,
      approval_status, approved_by, approved_at,
      maintenance_type, activity_type, activity_cause
    ) VALUES (
      NEW.organization_id, NEW.vehicle_id, v_wo_number,
      CASE WHEN v_is_inspection THEN 'inspection' ELSE COALESCE(NEW.request_type,'corrective') END,
      COALESCE(NEW.priority,'medium'),
      COALESCE(NEW.description, NEW.additional_description, 'Auto-generated from request '||NEW.request_number),
      CASE WHEN v_is_annual THEN 'annual_inspection'
           WHEN NEW.request_subtype = 'pre_trip' THEN 'pre_trip_inspection'
           WHEN NEW.request_subtype = 'post_trip' THEN 'post_trip_inspection'
           ELSE 'general' END,
      'open',
      NEW.request_type, NEW.requested_for, NEW.request_start_date, NEW.request_by_completion_date,
      NEW.km_reading, NEW.driver_type, NULL, NEW.driver_phone, NEW.fuel_level,
      NEW.remark, NEW.additional_description, NEW.context_value, NEW.asset_criticality,
      NEW.requested_by, NULL, NEW.contact_email, NEW.contact_phone,
      NEW.contact_preference, COALESCE(NEW.notify_user,false), NEW.supplier_name,
      'approved', NEW.approved_by, NEW.approved_at,
      CASE WHEN v_is_annual THEN 'outsourced' ELSE 'internal' END,
      CASE WHEN v_is_inspection THEN 'inspection' ELSE 'repair' END,
      'request'
    ) RETURNING id INTO v_wo_id;

    NEW.work_order_id := v_wo_id;

    -- Back-link inspection if one exists
    IF NEW.inspection_id IS NOT NULL THEN
      UPDATE public.vehicle_inspections
        SET work_order_id = v_wo_id,
            outsource_stage = CASE WHEN v_is_annual THEN 'sourcing' ELSE outsource_stage END
        WHERE id = NEW.inspection_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_wo_on_approval ON public.maintenance_requests;
CREATE TRIGGER trg_auto_create_wo_on_approval
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_work_order_on_approval();

-- =============================================================
-- 5) Auto-close work order when initiator submits pre/post inspection
-- =============================================================
CREATE OR REPLACE FUNCTION public.auto_close_pretrip_posttrip_wo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed','passed','signed_off')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.inspection_type IN ('pre_trip','post_trip')
     AND NEW.work_order_id IS NOT NULL THEN
    UPDATE public.work_orders
      SET status = 'completed',
          completed_date = now(),
          notes = COALESCE(notes,'') ||
            E'\nAuto-closed by initiator on '|| to_char(now(),'YYYY-MM-DD HH24:MI')
      WHERE id = NEW.work_order_id;

    NEW.closed_by_initiator_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_close_pretrip_posttrip_wo ON public.vehicle_inspections;
CREATE TRIGGER trg_auto_close_pretrip_posttrip_wo
  BEFORE UPDATE ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.auto_close_pretrip_posttrip_wo();

-- =============================================================
-- 6) Helpful indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_vi_outsource_stage ON public.vehicle_inspections(outsource_stage);
CREATE INDEX IF NOT EXISTS idx_vi_work_order ON public.vehicle_inspections(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mr_approver_role ON public.maintenance_requests(approver_role);
CREATE INDEX IF NOT EXISTS idx_mr_inspection ON public.maintenance_requests(inspection_id);