
-- Create fuel_request_approvals table
CREATE TABLE public.fuel_request_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  fuel_request_id UUID NOT NULL REFERENCES public.fuel_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  approver_role TEXT NOT NULL DEFAULT 'fleet_manager',
  step INTEGER NOT NULL DEFAULT 1,
  action TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_request_approvals ENABLE ROW LEVEL SECURITY;

-- Org members can view
CREATE POLICY "Org members can view fuel request approvals"
ON public.fuel_request_approvals FOR SELECT TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Approver can update their own record
CREATE POLICY "Approver can update own fuel approval"
ON public.fuel_request_approvals FOR UPDATE TO authenticated
USING (approver_id = auth.uid());

-- System inserts via function
CREATE POLICY "Org members can insert fuel request approvals"
ON public.fuel_request_approvals FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_fuel_req_approvals_approver ON public.fuel_request_approvals(approver_id, action);
CREATE INDEX idx_fuel_req_approvals_request ON public.fuel_request_approvals(fuel_request_id);

-- Timestamp trigger
CREATE TRIGGER update_fuel_request_approvals_updated_at
BEFORE UPDATE ON public.fuel_request_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to route fuel request to approvers
CREATE OR REPLACE FUNCTION public.route_fuel_request_approval(p_fuel_request_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_org_id UUID;
  v_approver_id UUID;
  v_delegate_id UUID;
  v_step INTEGER := 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.fuel_requests WHERE id = p_fuel_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Fuel request not found';
  END IF;

  v_org_id := v_request.organization_id;

  -- Delete existing approvals for re-routing
  DELETE FROM public.fuel_request_approvals WHERE fuel_request_id = p_fuel_request_id;

  -- Step 1: Route to fleet_manager
  SELECT ur.user_id INTO v_approver_id
  FROM public.user_roles ur
  WHERE ur.organization_id = v_org_id
    AND ur.role = 'fleet_manager'
    AND ur.user_id != v_request.requested_by
  LIMIT 1;

  -- If no fleet_manager, try operations_manager
  IF v_approver_id IS NULL THEN
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role = 'operations_manager'
      AND ur.user_id != v_request.requested_by
    LIMIT 1;
  END IF;

  -- If still none, try org_admin
  IF v_approver_id IS NULL THEN
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role IN ('org_admin', 'super_admin')
      AND ur.user_id != v_request.requested_by
    LIMIT 1;
  END IF;

  IF v_approver_id IS NULL THEN
    RETURN 'no_approver_found';
  END IF;

  -- Check delegation
  v_delegate_id := get_active_delegate(v_approver_id, 'fuel_requests', COALESCE(v_request.estimated_cost, 0));
  IF v_delegate_id IS NOT NULL THEN
    v_approver_id := v_delegate_id;
  END IF;

  INSERT INTO public.fuel_request_approvals (
    organization_id, fuel_request_id, approver_id, approver_role, step, action
  ) VALUES (
    v_org_id, p_fuel_request_id, v_approver_id, 'fleet_manager', v_step, 'pending'
  );

  -- Step 2: If high cost, add operations_manager
  IF COALESCE(v_request.estimated_cost, 0) > 5000 THEN
    v_step := 2;
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role = 'operations_manager'
      AND ur.user_id != v_request.requested_by
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      v_delegate_id := get_active_delegate(v_approver_id, 'fuel_requests', COALESCE(v_request.estimated_cost, 0));
      IF v_delegate_id IS NOT NULL THEN
        v_approver_id := v_delegate_id;
      END IF;

      INSERT INTO public.fuel_request_approvals (
        organization_id, fuel_request_id, approver_id, approver_role, step, action
      ) VALUES (
        v_org_id, p_fuel_request_id, v_approver_id, 'operations_manager', v_step, 'pending'
      );
    END IF;
  END IF;

  -- Update request status
  UPDATE public.fuel_requests
  SET status = 'pending', updated_at = now()
  WHERE id = p_fuel_request_id;

  RETURN 'routed';
END;
$$;

-- Enable realtime for fuel_request_approvals
ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_request_approvals;
