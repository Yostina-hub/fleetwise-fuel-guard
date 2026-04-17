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

  DELETE FROM public.fuel_request_approvals
  WHERE fuel_request_id = p_fuel_request_id;

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
      AND ur.user_id <> v_request.requested_by
    ORDER BY ur.user_id
    LIMIT 1;

    IF v_approver_id IS NULL THEN
      SELECT ur.user_id, ur.role::text
      INTO v_approver_id, v_resolved_role
      FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id
        AND ur.role::text = v_rule.approver_role
      ORDER BY CASE WHEN ur.user_id = v_request.requested_by THEN 1 ELSE 0 END, ur.user_id
      LIMIT 1;
    END IF;

    IF v_approver_id IS NULL AND COALESCE(array_length(v_fallback_roles, 1), 0) > 0 THEN
      SELECT ur.user_id, ur.role::text
      INTO v_approver_id, v_resolved_role
      FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id
        AND ur.user_id <> v_request.requested_by
        AND ur.role::text = ANY(v_fallback_roles)
      ORDER BY array_position(v_fallback_roles, ur.role::text), ur.user_id
      LIMIT 1;
    END IF;

    IF v_approver_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', v_rule.rule_name, 'fuel_request',
        format(
          'Skipped rule "%s" – no same-organization approver found for required role %s',
          v_rule.rule_name,
          v_rule.approver_role
        ),
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'required_role', v_rule.approver_role,
          'step_order', v_rule.step_order,
          'cost', v_cost,
          'request_number', v_request_label
        ),
        v_actor_id, v_actor_name
      );
      CONTINUE;
    END IF;

    SELECT email INTO v_approver_name
    FROM public.profiles
    WHERE id = v_approver_id;

    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);

    IF v_approver_id = v_request.requested_by AND v_delegate_id IS NULL AND COALESCE(array_length(v_fallback_roles, 1), 0) > 0 THEN
      SELECT ur.user_id, ur.role::text
      INTO v_approver_id, v_resolved_role
      FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id
        AND ur.user_id <> v_request.requested_by
        AND ur.role::text = ANY(v_fallback_roles)
      ORDER BY array_position(v_fallback_roles, ur.role::text), ur.user_id
      LIMIT 1;

      IF v_approver_id IS NOT NULL THEN
        SELECT email INTO v_approver_name
        FROM public.profiles
        WHERE id = v_approver_id;

        v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
      END IF;
    END IF;

    IF v_approver_id = v_request.requested_by AND v_delegate_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', v_rule.rule_name, 'fuel_request',
        format(
          'Skipped rule "%s" – requester is the only available %s and no substitute is configured',
          v_rule.rule_name,
          v_rule.approver_role
        ),
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'required_role', v_rule.approver_role,
          'requester_id', v_request.requested_by,
          'cost', v_cost,
          'request_number', v_request_label
        ),
        v_actor_id, v_actor_name
      );
      CONTINUE;
    END IF;

    IF v_delegate_id IS NOT NULL THEN
      SELECT email INTO v_delegate_name
      FROM public.profiles
      WHERE id = v_delegate_id;

      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, old_values, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'substitute', v_rule.rule_name, 'fuel_request',
        format(
          'Step %s: %s → delegated to %s (rule "%s")',
          v_rule.step_order,
          COALESCE(v_approver_name, v_approver_id::text),
          COALESCE(v_delegate_name, v_delegate_id::text),
          v_rule.rule_name
        ),
        jsonb_build_object(
          'original_approver_id', v_approver_id,
          'original_approver', v_approver_name,
          'resolved_role', v_resolved_role
        ),
        jsonb_build_object(
          'delegate_id', v_delegate_id,
          'delegate', v_delegate_name,
          'required_role', v_rule.approver_role,
          'resolved_role', v_resolved_role,
          'step_order', v_rule.step_order,
          'cost', v_cost,
          'request_number', v_request_label
        ),
        v_actor_id, v_actor_name
      );

      v_approver_id := v_delegate_id;
      v_approver_name := v_delegate_name;
    END IF;

    v_step := v_step + 1;

    INSERT INTO public.fuel_request_approvals (
      organization_id, fuel_request_id, approver_id, approver_role, step, action
    ) VALUES (
      v_org_id, p_fuel_request_id, v_approver_id, v_rule.approver_role, v_step, 'pending'
    );

    v_inserted := v_inserted + 1;

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope,
      summary, new_values, actor_id, actor_name
    ) VALUES (
      v_org_id, 'fuel_request', p_fuel_request_id, 'route', v_rule.rule_name, 'fuel_request',
      CASE
        WHEN v_resolved_role = v_rule.approver_role THEN
          format(
            'Step %s assigned to %s (%s) via rule "%s" — cost %s ETB',
            v_step,
            COALESCE(v_approver_name, v_approver_id::text),
            v_rule.approver_role,
            v_rule.rule_name,
            v_cost
          )
        ELSE
          format(
            'Step %s assigned to %s using %s fallback for required %s via rule "%s" — cost %s ETB',
            v_step,
            COALESCE(v_approver_name, v_approver_id::text),
            v_resolved_role,
            v_rule.approver_role,
            v_rule.rule_name,
            v_cost
          )
      END,
      jsonb_build_object(
        'step', v_step,
        'required_role', v_rule.approver_role,
        'resolved_role', v_resolved_role,
        'approver_id', v_approver_id,
        'approver', v_approver_name,
        'rule_name', v_rule.rule_name,
        'cost', v_cost,
        'request_number', v_request_label,
        'min_amount', v_rule.min_amount,
        'max_amount', v_rule.max_amount
      ),
      v_actor_id, v_actor_name
    );
  END LOOP;

  IF v_inserted = 0 THEN
    v_approver_id := NULL;
    v_delegate_id := NULL;
    v_approver_name := NULL;
    v_delegate_name := NULL;
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

    IF v_approver_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', 'Legacy fallback', 'fuel_request',
        format('Legacy fallback could not assign any same-organization approver for cost %s ETB', v_cost),
        jsonb_build_object(
          'cost', v_cost,
          'request_number', v_request_label,
          'fallback', true
        ),
        v_actor_id, v_actor_name
      );
      RETURN 'no_approver_found';
    END IF;

    SELECT email INTO v_approver_name
    FROM public.profiles
    WHERE id = v_approver_id;

    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);

    IF v_delegate_id IS NOT NULL THEN
      SELECT email INTO v_delegate_name
      FROM public.profiles
      WHERE id = v_delegate_id;

      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, old_values, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'substitute', 'Legacy fallback', 'fuel_request',
        format(
          'Legacy step 1: %s → delegated to %s',
          COALESCE(v_approver_name, v_approver_id::text),
          COALESCE(v_delegate_name, v_delegate_id::text)
        ),
        jsonb_build_object(
          'original_approver_id', v_approver_id,
          'original_approver', v_approver_name,
          'resolved_role', v_resolved_role
        ),
        jsonb_build_object(
          'delegate_id', v_delegate_id,
          'delegate', v_delegate_name,
          'resolved_role', v_resolved_role,
          'cost', v_cost,
          'request_number', v_request_label
        ),
        v_actor_id, v_actor_name
      );

      v_approver_id := v_delegate_id;
      v_approver_name := v_delegate_name;
    END IF;

    INSERT INTO public.fuel_request_approvals (
      organization_id, fuel_request_id, approver_id, approver_role, step, action
    ) VALUES (
      v_org_id, p_fuel_request_id, v_approver_id, COALESCE(v_resolved_role, 'fleet_manager'), 1, 'pending'
    );

    v_step1_approver_id := v_approver_id;

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope,
      summary, new_values, actor_id, actor_name
    ) VALUES (
      v_org_id, 'fuel_request', p_fuel_request_id, 'route', 'Legacy fallback', 'fuel_request',
      format(
        'No matrix rule assigned this request — legacy step 1 routed to %s (%s) for cost %s ETB',
        COALESCE(v_approver_name, v_approver_id::text),
        COALESCE(v_resolved_role, 'fleet_manager'),
        v_cost
      ),
      jsonb_build_object(
        'cost', v_cost,
        'request_number', v_request_label,
        'fallback', true,
        'approver_id', v_approver_id,
        'approver', v_approver_name,
        'resolved_role', v_resolved_role
      ),
      v_actor_id, v_actor_name
    );

    IF v_cost > 5000 THEN
      v_approver_id := NULL;
      v_delegate_id := NULL;
      v_approver_name := NULL;
      v_delegate_name := NULL;
      v_resolved_role := NULL;
      v_fallback_roles := ARRAY['operations_manager', 'org_admin', 'super_admin']::TEXT[];

      SELECT ur.user_id, ur.role::text
      INTO v_approver_id, v_resolved_role
      FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id
        AND ur.user_id <> v_request.requested_by
        AND ur.user_id <> v_step1_approver_id
        AND ur.role::text = ANY(v_fallback_roles)
      ORDER BY array_position(v_fallback_roles, ur.role::text), ur.user_id
      LIMIT 1;

      IF v_approver_id IS NOT NULL THEN
        SELECT email INTO v_approver_name
        FROM public.profiles
        WHERE id = v_approver_id;

        v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);

        IF v_delegate_id IS NOT NULL THEN
          SELECT email INTO v_delegate_name
          FROM public.profiles
          WHERE id = v_delegate_id;

          INSERT INTO public.delegation_audit_log (
            organization_id, source_table, source_id, action, entity_name, scope,
            summary, old_values, new_values, actor_id, actor_name
          ) VALUES (
            v_org_id, 'fuel_request', p_fuel_request_id, 'substitute', 'Legacy escalation', 'fuel_request',
            format(
              'Legacy step 2: %s → delegated to %s',
              COALESCE(v_approver_name, v_approver_id::text),
              COALESCE(v_delegate_name, v_delegate_id::text)
            ),
            jsonb_build_object(
              'original_approver_id', v_approver_id,
              'original_approver', v_approver_name,
              'resolved_role', v_resolved_role
            ),
            jsonb_build_object(
              'delegate_id', v_delegate_id,
              'delegate', v_delegate_name,
              'resolved_role', v_resolved_role,
              'cost', v_cost,
              'request_number', v_request_label
            ),
            v_actor_id, v_actor_name
          );

          v_approver_id := v_delegate_id;
          v_approver_name := v_delegate_name;
        END IF;

        INSERT INTO public.fuel_request_approvals (
          organization_id, fuel_request_id, approver_id, approver_role, step, action
        ) VALUES (
          v_org_id, p_fuel_request_id, v_approver_id, COALESCE(v_resolved_role, 'operations_manager'), 2, 'pending'
        );

        INSERT INTO public.delegation_audit_log (
          organization_id, source_table, source_id, action, entity_name, scope,
          summary, new_values, actor_id, actor_name
        ) VALUES (
          v_org_id, 'fuel_request', p_fuel_request_id, 'route', 'Legacy escalation', 'fuel_request',
          format(
            'Legacy step 2 routed to %s (%s) for cost %s ETB',
            COALESCE(v_approver_name, v_approver_id::text),
            COALESCE(v_resolved_role, 'operations_manager'),
            v_cost
          ),
          jsonb_build_object(
            'cost', v_cost,
            'request_number', v_request_label,
            'fallback', true,
            'approver_id', v_approver_id,
            'approver', v_approver_name,
            'resolved_role', v_resolved_role,
            'step', 2
          ),
          v_actor_id, v_actor_name
        );
      END IF;
    END IF;
  END IF;

  RETURN 'routed';
END;
$function$;