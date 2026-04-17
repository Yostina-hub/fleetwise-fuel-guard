CREATE OR REPLACE FUNCTION public.route_fuel_request_approval(p_fuel_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_org_id UUID;
  v_cost NUMERIC;
  v_rule RECORD;
  v_approver_id UUID;
  v_delegate_id UUID;
  v_step INTEGER := 0;
  v_inserted INTEGER := 0;
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

  -- Reset any prior chain
  DELETE FROM public.fuel_request_approvals WHERE fuel_request_id = p_fuel_request_id;

  -- Build chain dynamically from authority_matrix (fuel_request scope)
  FOR v_rule IN
    SELECT approver_role, step_order, rule_name
    FROM public.authority_matrix
    WHERE organization_id = v_org_id
      AND scope = 'fuel_request'
      AND is_active = true
      AND (min_amount IS NULL OR v_cost >= min_amount)
      AND (max_amount IS NULL OR v_cost <= max_amount)
    ORDER BY step_order ASC, priority ASC
  LOOP
    -- Find a user in the org holding the required role (not the requester)
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role::text = v_rule.approver_role
      AND ur.user_id != v_request.requested_by
    LIMIT 1;

    -- Skip rule if no eligible user (don't block the workflow)
    IF v_approver_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Honor active delegation/substitution
    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
    IF v_delegate_id IS NOT NULL THEN
      v_approver_id := v_delegate_id;
    END IF;

    v_step := v_step + 1;
    INSERT INTO public.fuel_request_approvals (
      organization_id, fuel_request_id, approver_id, approver_role, step, action
    ) VALUES (
      v_org_id, p_fuel_request_id, v_approver_id, v_rule.approver_role, v_step, 'pending'
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  -- Fallback: legacy hardcoded chain if matrix produced no steps
  IF v_inserted = 0 THEN
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
      v_org_id, p_fuel_request_id, v_approver_id, 'fleet_manager', 1, 'pending'
    );

    IF v_cost > 5000 THEN
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
          v_org_id, p_fuel_request_id, v_approver_id, 'operations_manager', 2, 'pending'
        );
      END IF;
    END IF;
  END IF;

  RETURN 'routed';
END;
$function$;