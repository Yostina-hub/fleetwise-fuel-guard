CREATE OR REPLACE FUNCTION public.route_fuel_wo_approval(p_wo_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wo RECORD;
  v_amount NUMERIC;
  v_step INT := 1;
  v_user_id UUID;
  v_delegate UUID;
  v_role TEXT;
BEGIN
  SELECT * INTO v_wo FROM public.fuel_work_orders WHERE id = p_wo_id;
  IF v_wo IS NULL THEN RAISE EXCEPTION 'Fuel work order not found'; END IF;

  v_amount := COALESCE(v_wo.emoney_amount, 0);

  -- Clear existing pending steps
  DELETE FROM public.fuel_wo_approvals WHERE fuel_work_order_id = p_wo_id AND action='pending';

  -- Step 1: prefer fleet_manager, fall back to operations_manager so every WO has a route
  v_role := 'fleet_manager';
  SELECT user_id INTO v_user_id
  FROM public.user_roles
  WHERE organization_id = v_wo.organization_id AND role::text = 'fleet_manager'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_role := 'operations_manager';
    SELECT user_id INTO v_user_id
    FROM public.user_roles
    WHERE organization_id = v_wo.organization_id AND role::text = 'operations_manager'
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    v_delegate := public.get_active_delegate(v_user_id, 'approvals', v_amount);
    INSERT INTO public.fuel_wo_approvals (
      organization_id, fuel_work_order_id, step, approver_id,
      original_approver_id, approver_role, is_delegated
    ) VALUES (
      v_wo.organization_id, p_wo_id, v_step, COALESCE(v_delegate, v_user_id),
      CASE WHEN v_delegate IS NOT NULL THEN v_user_id ELSE NULL END,
      v_role, v_delegate IS NOT NULL
    );
    v_step := v_step + 1;
  END IF;

  -- Step 2 (escalation): operations_manager when amount > 10000 ETB
  -- Skip if step 1 already used operations_manager (avoid duplicate approver row)
  IF v_amount > 10000 AND v_role <> 'operations_manager' THEN
    SELECT user_id INTO v_user_id
    FROM public.user_roles
    WHERE organization_id = v_wo.organization_id AND role::text = 'operations_manager'
    LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      v_delegate := public.get_active_delegate(v_user_id, 'approvals', v_amount);
      INSERT INTO public.fuel_wo_approvals (
        organization_id, fuel_work_order_id, step, approver_id,
        original_approver_id, approver_role, is_delegated
      ) VALUES (
        v_wo.organization_id, p_wo_id, v_step, COALESCE(v_delegate, v_user_id),
        CASE WHEN v_delegate IS NOT NULL THEN v_user_id ELSE NULL END,
        'operations_manager', v_delegate IS NOT NULL
      );
    END IF;
  END IF;

  UPDATE public.fuel_work_orders
  SET approval_status = 'pending', updated_at = now()
  WHERE id = p_wo_id;

  RETURN 'routed';
END;
$function$;