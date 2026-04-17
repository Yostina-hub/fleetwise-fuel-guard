CREATE OR REPLACE FUNCTION public.route_fuel_request_approval(p_fuel_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_org_id UUID;
  v_approver_id UUID;
  v_delegate_id UUID;
  v_step INTEGER := 1;
  v_cost NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.fuel_requests WHERE id = p_fuel_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Fuel request not found';
  END IF;

  v_org_id := v_request.organization_id;
  v_cost := COALESCE(v_request.estimated_cost, 0)::numeric;

  DELETE FROM public.fuel_request_approvals WHERE fuel_request_id = p_fuel_request_id;

  SELECT ur.user_id INTO v_approver_id
  FROM public.user_roles ur
  WHERE ur.organization_id = v_org_id
    AND ur.role = 'fleet_manager'
    AND ur.user_id != v_request.requested_by
  LIMIT 1;

  IF v_approver_id IS NULL THEN
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role = 'operations_manager'
      AND ur.user_id != v_request.requested_by
    LIMIT 1;
  END IF;

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

  v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
  IF v_delegate_id IS NOT NULL THEN
    v_approver_id := v_delegate_id;
  END IF;

  INSERT INTO public.fuel_request_approvals (
    organization_id, fuel_request_id, approver_id, approver_role, step, action
  ) VALUES (
    v_org_id, p_fuel_request_id, v_approver_id, 'fleet_manager', v_step, 'pending'
  );

  IF v_cost > 5000 THEN
    v_step := 2;
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role = 'operations_manager'
      AND ur.user_id != v_request.requested_by
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
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

  UPDATE public.fuel_requests
  SET status = 'pending', updated_at = now()
  WHERE id = p_fuel_request_id;

  RETURN 'routed';
END;
$function$;