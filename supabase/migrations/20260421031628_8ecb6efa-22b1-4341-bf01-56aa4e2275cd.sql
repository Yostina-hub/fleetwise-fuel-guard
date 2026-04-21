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
  v_actor_id UUID := auth.uid();
  v_actor_name TEXT;
  v_request_label TEXT;
  v_approver_name TEXT;
  v_delegate_name TEXT;
  v_resolved_role TEXT;
  v_fallback_roles TEXT[];
  v_step1_approver_id UUID;
  v_requester_role TEXT;
  v_self_approve_roles TEXT[] := ARRAY['fleet_manager','operations_manager','org_admin','super_admin','fleet_owner']::TEXT[];
  v_auto_approve_roles TEXT[] := ARRAY['org_admin','super_admin','fleet_owner']::TEXT[];
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request
  FROM public.fuel_requests
  WHERE id = p_fuel_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Fuel request not found';
  END IF;

  v_org_id := v_request.organization_id;
  v_cost := COALESCE(v_request.estimated_cost, 0)::numeric;
  v_request_label := COALESCE(v_request.request_number, p_fuel_request_id::text);

  SELECT email INTO v_actor_name
  FROM public.profiles
  WHERE id = v_actor_id;

  -- Determine highest role of the requester (priority: super_admin > org_admin > fleet_owner > operations_manager > fleet_manager > others)
  SELECT ur.role::text INTO v_requester_role
  FROM public.user_roles ur
  WHERE ur.organization_id = v_org_id
    AND ur.user_id = v_request.requested_by
    AND ur.role::text = ANY(v_self_approve_roles)
  ORDER BY array_position(ARRAY['super_admin','org_admin','fleet_owner','operations_manager','fleet_manager']::TEXT[], ur.role::text)
  LIMIT 1;

  DELETE FROM public.fuel_request_approvals
  WHERE fuel_request_id = p_fuel_request_id;

  -- AUTO-APPROVE PATH: org_admin / super_admin / fleet_owner submitting their own request
  IF v_requester_role = ANY(v_auto_approve_roles) THEN
    UPDATE public.fuel_requests SET
      status = 'approved',
      liters_approved = COALESCE(liters_approved, liters_requested),
      approved_by = v_request.requested_by,
      approved_at = now(),
      updated_at = now()
    WHERE id = p_fuel_request_id;

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope,
      summary, new_values, actor_id, actor_name
    ) VALUES (
      v_org_id, 'fuel_request', p_fuel_request_id, 'auto_approve', 'self_approval', 'fuel_request',
      format('Auto-approved: requester %s holds role %s and meets self-approval policy — cost %s ETB',
        COALESCE(v_actor_name, v_actor_id::text), v_requester_role, v_cost),
      jsonb_build_object(
        'requester_role', v_requester_role,
        'cost', v_cost,
        'request_number', v_request_label,
        'auto_approved', true
      ),
      v_actor_id, v_actor_name
    );

    RETURN 'auto_approved';
  END IF;

  FOR v_rule IN
    SELECT approver_role, step_order, rule_name, min_amount, max_amount, priority
    FROM public.authority_matrix
    WHERE organization_id = v_org_id
      AND scope = 'fuel_request'
      AND is_active = true
      AND (min_amount IS NULL OR v_cost >= min_amount)
      AND (max_amount IS NULL OR v_cost <= max_amount)
    ORDER BY step_order ASC, priority ASC
  LOOP
    v_approver_id := NULL;
    v_delegate_id := NULL;
    v_approver_name := NULL;
    v_delegate_name := NULL;
    v_resolved_role := v_rule.approver_role;
    v_fallback_roles := CASE
      WHEN v_rule.approver_role = 'fleet_manager' THEN ARRAY['operations_manager', 'org_admin', 'super_admin']::TEXT[]
      WHEN v_rule.approver_role = 'operations_manager' THEN ARRAY['org_admin', 'super_admin']::TEXT[]
      ELSE ARRAY['org_admin', 'super_admin']::TEXT[]
    END;

    SELECT ur.user_id, ur.role::text
    INTO v_approver_id, v_resolved_role
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role::text = v_rule.approver_role
    LIMIT 1;

    IF v_approver_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', v_rule.rule_name, 'fuel_request',
        format('Skipped rule "%s" – no same-organization approver found for required role %s',
          v_rule.rule_name, v_rule.approver_role),
        jsonb_build_object('rule_name', v_rule.rule_name, 'required_role', v_rule.approver_role,
          'step_order', v_rule.step_order, 'cost', v_cost, 'request_number', v_request_label),
        v_actor_id, v_actor_name
      );
      CONTINUE;
    END IF;

    SELECT email INTO v_approver_name FROM public.profiles WHERE id = v_approver_id;

    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);

    -- SELF-APPROVAL PATH: if the only resolved approver is the requester AND requester holds an
    -- approver role (fleet_manager / operations_manager etc.), allow them to self-approve via the inbox.
    -- Previously this branch attempted to find a substitute then skipped — now we keep the requester
    -- as the assigned approver so the request actually gets routed.
    IF v_approver_id = v_request.requested_by AND v_delegate_id IS NULL
       AND v_requester_role IS NOT NULL THEN
      -- Allow self-approval — keep approver_id = requester (no substitution attempt).
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'self_approve_allowed', v_rule.rule_name, 'fuel_request',
        format('Self-approval allowed for rule "%s" — requester %s holds role %s',
          v_rule.rule_name, COALESCE(v_actor_name, v_actor_id::text), v_requester_role),
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'required_role', v_rule.approver_role,
          'requester_role', v_requester_role,
          'requester_id', v_request.requested_by,
          'cost', v_cost,
          'request_number', v_request_label
        ),
        v_actor_id, v_actor_name
      );
    -- Otherwise, the legacy substitute-or-skip behavior applies.
    ELSIF v_approver_id = v_request.requested_by AND v_delegate_id IS NULL AND COALESCE(array_length(v_fallback_roles, 1), 0) > 0 THEN
      SELECT ur.user_id, ur.role::text
      INTO v_approver_id, v_resolved_role
      FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id
        AND ur.user_id <> v_request.requested_by
        AND ur.role::text = ANY(v_fallback_roles)
      ORDER BY array_position(v_fallback_roles, ur.role::text), ur.user_id
      LIMIT 1;

      IF v_approver_id IS NOT NULL THEN
        SELECT email INTO v_approver_name FROM public.profiles WHERE id = v_approver_id;
        v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
      END IF;
    END IF;

    -- Final guard: still couldn't resolve and not allowed to self-approve → skip.
    IF v_approver_id = v_request.requested_by AND v_delegate_id IS NULL AND v_requester_role IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', v_rule.rule_name, 'fuel_request',
        format('Skipped rule "%s" – requester is the only available %s and no substitute is configured',
          v_rule.rule_name, v_rule.approver_role),
        jsonb_build_object('rule_name', v_rule.rule_name, 'required_role', v_rule.approver_role,
          'requester_id', v_request.requested_by, 'cost', v_cost, 'request_number', v_request_label),
        v_actor_id, v_actor_name
      );
      CONTINUE;
    END IF;

    IF v_delegate_id IS NOT NULL THEN
      SELECT email INTO v_delegate_name FROM public.profiles WHERE id = v_delegate_id;
    END IF;

    v_step := v_step + 1;

    INSERT INTO public.fuel_request_approvals (
      fuel_request_id, organization_id, step, approver_id, approver_role, action, created_at, updated_at
    ) VALUES (
      p_fuel_request_id, v_org_id, v_step,
      COALESCE(v_delegate_id, v_approver_id),
      v_resolved_role, 'pending', now(), now()
    );

    v_inserted := v_inserted + 1;
    IF v_step = 1 THEN
      v_step1_approver_id := COALESCE(v_delegate_id, v_approver_id);
    END IF;

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope,
      summary, new_values, actor_id, actor_name
    ) VALUES (
      v_org_id, 'fuel_request', p_fuel_request_id, 'route', v_rule.rule_name, 'fuel_request',
      CASE
        WHEN v_resolved_role = v_rule.approver_role THEN
          format('Step %s assigned to %s (%s) via rule "%s" — cost %s ETB',
            v_step, COALESCE(v_approver_name, v_approver_id::text),
            v_rule.approver_role, v_rule.rule_name, v_cost)
        ELSE
          format('Step %s assigned to %s using %s fallback for required %s via rule "%s" — cost %s ETB',
            v_step, COALESCE(v_approver_name, v_approver_id::text),
            v_resolved_role, v_rule.approver_role, v_rule.rule_name, v_cost)
      END,
      jsonb_build_object('step', v_step, 'required_role', v_rule.approver_role,
        'resolved_role', v_resolved_role, 'approver_id', v_approver_id,
        'approver', v_approver_name, 'rule_name', v_rule.rule_name, 'cost', v_cost,
        'request_number', v_request_label, 'min_amount', v_rule.min_amount, 'max_amount', v_rule.max_amount),
      v_actor_id, v_actor_name
    );
  END LOOP;

  IF v_inserted = 0 THEN
    -- Legacy fallback: pick ANY same-org approver (excluding requester, unless requester is auto-eligible)
    v_approver_id := NULL;
    v_resolved_role := NULL;
    v_fallback_roles := ARRAY['fleet_manager', 'operations_manager', 'org_admin', 'super_admin']::TEXT[];

    SELECT ur.user_id, ur.role::text
    INTO v_approver_id, v_resolved_role
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.user_id <> v_request.requested_by
      AND ur.role::text = ANY(v_fallback_roles)
    ORDER BY array_position(v_fallback_roles, ur.role::text), ur.user_id
    LIMIT 1;

    -- If still nothing AND requester is a manager → assign requester for self-approval
    IF v_approver_id IS NULL AND v_requester_role IS NOT NULL THEN
      v_approver_id := v_request.requested_by;
      v_resolved_role := v_requester_role;
    END IF;

    IF v_approver_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', 'Legacy fallback', 'fuel_request',
        format('Legacy fallback could not assign any same-organization approver for cost %s ETB', v_cost),
        jsonb_build_object('cost', v_cost, 'request_number', v_request_label, 'fallback', true),
        v_actor_id, v_actor_name
      );
      RETURN 'no_approver_found';
    END IF;

    SELECT email INTO v_approver_name FROM public.profiles WHERE id = v_approver_id;
    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
    IF v_delegate_id IS NOT NULL THEN
      SELECT email INTO v_delegate_name FROM public.profiles WHERE id = v_delegate_id;
    END IF;

    v_step := 1;
    INSERT INTO public.fuel_request_approvals (
      fuel_request_id, organization_id, step, approver_id, approver_role, action, created_at, updated_at
    ) VALUES (
      p_fuel_request_id, v_org_id, v_step,
      COALESCE(v_delegate_id, v_approver_id),
      v_resolved_role, 'pending', now(), now()
    );
    v_step1_approver_id := COALESCE(v_delegate_id, v_approver_id);
    v_inserted := 1;
  END IF;

  RETURN 'routed:' || v_inserted::text;
END;
$function$;