CREATE OR REPLACE FUNCTION public.auto_complete_fuel_wo_approvals(
  p_wo_id UUID,
  p_emoney_amount NUMERIC DEFAULT NULL,
  p_comment TEXT DEFAULT 'Auto-approved (stub workflow)'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo RECORD;
  v_step RECORD;
  v_emoney_app_id UUID;
  v_wo_approved INT := 0;
  v_emoney_approved BOOL := false;
  v_user_id UUID;
  v_role TEXT;
BEGIN
  SELECT * INTO v_wo FROM public.fuel_work_orders WHERE id = p_wo_id;
  IF v_wo IS NULL THEN RAISE EXCEPTION 'Work order not found'; END IF;

  -- Approve all pending WO approval steps as the assigned approver
  FOR v_step IN
    SELECT * FROM public.fuel_wo_approvals
    WHERE fuel_work_order_id = p_wo_id AND action = 'pending'
    ORDER BY step
  LOOP
    UPDATE public.fuel_wo_approvals SET
      action = 'approved', comment = p_comment, acted_at = now(), updated_at = now()
    WHERE id = v_step.id;
    v_wo_approved := v_wo_approved + 1;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.fuel_wo_approvals
    WHERE fuel_work_order_id = p_wo_id AND action = 'pending'
  ) THEN
    UPDATE public.fuel_work_orders SET
      approval_status = 'approved',
      status = 'released',
      approved_at = COALESCE(approved_at, now()),
      final_approved_at = COALESCE(final_approved_at, now()),
      updated_at = now()
    WHERE id = p_wo_id;
  END IF;

  -- Optional: create + approve e-money approval row
  IF p_emoney_amount IS NOT NULL AND p_emoney_amount > 0 THEN
    SELECT id INTO v_emoney_app_id
    FROM public.fuel_emoney_approvals
    WHERE fuel_work_order_id = p_wo_id AND status = 'pending'
    LIMIT 1;

    IF v_emoney_app_id IS NULL THEN
      -- Pick role by amount; fall back across roles if user not found
      v_role := CASE WHEN p_emoney_amount > 5000 THEN 'operations_manager' ELSE 'fleet_manager' END;
      SELECT user_id INTO v_user_id
      FROM public.user_roles
      WHERE organization_id = v_wo.organization_id AND role::text = v_role
      LIMIT 1;

      IF v_user_id IS NULL THEN
        -- Try the other role
        v_role := CASE WHEN v_role = 'fleet_manager' THEN 'operations_manager' ELSE 'fleet_manager' END;
        SELECT user_id INTO v_user_id
        FROM public.user_roles
        WHERE organization_id = v_wo.organization_id AND role::text = v_role
        LIMIT 1;
      END IF;

      IF v_user_id IS NULL THEN
        -- Last resort: any role in the org
        v_role := 'fleet_manager';
        SELECT user_id INTO v_user_id
        FROM public.user_roles
        WHERE organization_id = v_wo.organization_id
        LIMIT 1;
      END IF;

      IF v_user_id IS NOT NULL THEN
        INSERT INTO public.fuel_emoney_approvals (
          organization_id, fuel_work_order_id, amount,
          initiated_by, approver_id, approver_role, status
        ) VALUES (
          v_wo.organization_id, p_wo_id, p_emoney_amount,
          v_user_id, v_user_id, v_role, 'pending'
        ) RETURNING id INTO v_emoney_app_id;
      END IF;
    END IF;

    IF v_emoney_app_id IS NOT NULL THEN
      UPDATE public.fuel_emoney_approvals SET
        status = 'approved', comment = p_comment, acted_at = now(), updated_at = now()
      WHERE id = v_emoney_app_id;

      UPDATE public.fuel_work_orders SET
        emoney_amount = p_emoney_amount,
        emoney_approved_at = COALESCE(emoney_approved_at, now()),
        emoney_transfer_status = CASE
          WHEN emoney_transfer_status IN ('completed','initiated') THEN emoney_transfer_status
          ELSE 'approved'
        END,
        updated_at = now()
      WHERE id = p_wo_id;

      v_emoney_approved := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'wo_steps_approved', v_wo_approved,
    'emoney_approval_id', v_emoney_app_id,
    'emoney_approved', v_emoney_approved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_complete_fuel_wo_approvals(UUID, NUMERIC, TEXT) TO authenticated, service_role;