-- Extend fuel_work_orders with Oracle-style WO fields
ALTER TABLE public.fuel_work_orders
  ADD COLUMN IF NOT EXISTS planner_id uuid,
  ADD COLUMN IF NOT EXISTS planner_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS department_description text,
  ADD COLUMN IF NOT EXISTS asset_group text,
  ADD COLUMN IF NOT EXISTS asset_number text,
  ADD COLUMN IF NOT EXISTS asset_activity text,
  ADD COLUMN IF NOT EXISTS wip_accounting_class text DEFAULT 'eAM_Default',
  ADD COLUMN IF NOT EXISTS scheduled_start_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS scheduled_completion_date timestamptz,
  ADD COLUMN IF NOT EXISTS duration numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS request_number text,
  ADD COLUMN IF NOT EXISTS firm boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wo_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS work_order_type text,
  ADD COLUMN IF NOT EXISTS shutdown_type text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS project text,
  ADD COLUMN IF NOT EXISTS task text,
  ADD COLUMN IF NOT EXISTS rebuild_parent text,
  ADD COLUMN IF NOT EXISTS activity_type text,
  ADD COLUMN IF NOT EXISTS activity_cause text,
  ADD COLUMN IF NOT EXISTS activity_source text,
  ADD COLUMN IF NOT EXISTS enable_material_issue_request boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS planned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_status text,
  ADD COLUMN IF NOT EXISTS warranty_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_expiration_date timestamptz,
  ADD COLUMN IF NOT EXISTS tagout_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS context text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS remark1 text,
  ADD COLUMN IF NOT EXISTS remark2 text,
  ADD COLUMN IF NOT EXISTS remark3 text,
  ADD COLUMN IF NOT EXISTS remark4 text,
  ADD COLUMN IF NOT EXISTS agreement_number text,
  ADD COLUMN IF NOT EXISTS additional_description text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_cause text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- Index for filtering & joining
CREATE INDEX IF NOT EXISTS idx_fuel_work_orders_wo_status ON public.fuel_work_orders(wo_status);
CREATE INDEX IF NOT EXISTS idx_fuel_work_orders_priority ON public.fuel_work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_fuel_work_orders_planner ON public.fuel_work_orders(planner_id);

-- Auto-populate WO header from fuel_request when WO is created via trigger
CREATE OR REPLACE FUNCTION public.populate_fuel_wo_header()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF NEW.fuel_request_id IS NOT NULL THEN
    SELECT * INTO v_req FROM public.fuel_requests WHERE id = NEW.fuel_request_id;
    IF v_req IS NOT NULL THEN
      NEW.request_number := COALESCE(NEW.request_number, v_req.request_number);
      NEW.description := COALESCE(NEW.description, v_req.purpose, 'Fuel work order');
      NEW.department := COALESCE(NEW.department, v_req.assigned_department, v_req.requestor_department);
      NEW.priority := COALESCE(NEW.priority, v_req.priority, 'medium');
      NEW.scheduled_start_date := COALESCE(NEW.scheduled_start_date, v_req.request_by_start_date, now());
      NEW.scheduled_completion_date := COALESCE(NEW.scheduled_completion_date, v_req.request_by_completion_date);
      NEW.context := COALESCE(NEW.context, v_req.context_value);
      NEW.additional_description := COALESCE(NEW.additional_description, v_req.additional_description);
      NEW.work_order_type := COALESCE(NEW.work_order_type, v_req.work_request_type, 'fuel');
      NEW.activity_type := COALESCE(NEW.activity_type, 'fuel_dispense');
      NEW.activity_cause := COALESCE(NEW.activity_cause, CASE WHEN v_req.trigger_source = 'auto' THEN 'low_efficiency' ELSE 'request' END);
      NEW.activity_source := COALESCE(NEW.activity_source, v_req.trigger_source, 'manual');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_fuel_wo_header ON public.fuel_work_orders;
CREATE TRIGGER trg_populate_fuel_wo_header
  BEFORE INSERT OR UPDATE ON public.fuel_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_fuel_wo_header();

-- View pending approvals routed to current user (with delegation visibility)
CREATE OR REPLACE FUNCTION public.get_my_pending_fuel_approvals()
RETURNS TABLE(
  approval_id uuid,
  fuel_request_id uuid,
  request_number text,
  step int,
  approver_role text,
  estimated_cost numeric,
  liters_requested numeric,
  requested_by_name text,
  vehicle_plate text,
  generator_name text,
  priority text,
  created_at timestamptz,
  is_delegated boolean,
  original_approver_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fra.id AS approval_id,
    fra.fuel_request_id,
    fr.request_number,
    fra.step,
    fra.approver_role,
    fr.estimated_cost::numeric,
    fr.liters_requested::numeric,
    COALESCE(p.full_name, p.email)::text AS requested_by_name,
    v.plate_number AS vehicle_plate,
    g.name AS generator_name,
    fr.priority,
    fra.created_at,
    EXISTS(
      SELECT 1 FROM public.delegation_rules dr
      WHERE dr.delegate_id = auth.uid()
        AND dr.is_active = true
        AND dr.valid_from <= now()
        AND (dr.valid_until IS NULL OR dr.valid_until > now())
        AND (dr.scope = 'fuel_requests' OR dr.scope = 'all')
    ) AS is_delegated,
    (SELECT dr.delegator_name FROM public.delegation_rules dr
       WHERE dr.delegate_id = auth.uid()
         AND dr.is_active = true
         AND dr.valid_from <= now()
         AND (dr.valid_until IS NULL OR dr.valid_until > now())
         AND (dr.scope = 'fuel_requests' OR dr.scope = 'all')
       LIMIT 1) AS original_approver_name
  FROM public.fuel_request_approvals fra
  JOIN public.fuel_requests fr ON fr.id = fra.fuel_request_id
  LEFT JOIN public.profiles p ON p.id = fr.requested_by
  LEFT JOIN public.vehicles v ON v.id = fr.vehicle_id
  LEFT JOIN public.generators g ON g.id = fr.generator_id
  WHERE fra.approver_id = auth.uid()
    AND fra.action = 'pending'
    AND fr.status = 'pending'
  ORDER BY 
    CASE fr.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    fra.created_at DESC;
$$;

-- Action approval (approve/reject single step). Advances request status when all steps done.
CREATE OR REPLACE FUNCTION public.action_fuel_approval(
  p_approval_id uuid,
  p_action text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appr RECORD;
  v_req RECORD;
  v_pending_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_action NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT * INTO v_appr FROM public.fuel_request_approvals WHERE id = p_approval_id;
  IF v_appr IS NULL THEN RAISE EXCEPTION 'Approval not found'; END IF;
  IF v_appr.approver_id <> auth.uid() THEN RAISE EXCEPTION 'You are not the assigned approver'; END IF;
  IF v_appr.action <> 'pending' THEN RAISE EXCEPTION 'Approval already actioned'; END IF;

  UPDATE public.fuel_request_approvals SET
    action = p_action,
    comment = p_comment,
    acted_at = now(),
    updated_at = now()
  WHERE id = p_approval_id;

  SELECT * INTO v_req FROM public.fuel_requests WHERE id = v_appr.fuel_request_id;

  IF p_action = 'rejected' THEN
    UPDATE public.fuel_requests SET
      status = 'rejected',
      rejected_reason = COALESCE(p_comment, 'Rejected via approval workflow'),
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
    WHERE id = v_appr.fuel_request_id;
    RETURN jsonb_build_object('success', true, 'final_status', 'rejected');
  END IF;

  -- Approved: check if any pending steps remain
  SELECT COUNT(*) INTO v_pending_count
  FROM public.fuel_request_approvals
  WHERE fuel_request_id = v_appr.fuel_request_id AND action = 'pending';

  IF v_pending_count = 0 THEN
    UPDATE public.fuel_requests SET
      status = 'approved',
      liters_approved = COALESCE(liters_approved, liters_requested),
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
    WHERE id = v_appr.fuel_request_id;
    RETURN jsonb_build_object('success', true, 'final_status', 'approved', 'work_order_created', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'final_status', 'pending', 'remaining_steps', v_pending_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_pending_fuel_approvals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.action_fuel_approval(uuid, text, text) TO authenticated;