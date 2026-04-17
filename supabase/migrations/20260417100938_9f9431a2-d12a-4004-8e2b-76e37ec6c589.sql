-- Extend delegation_audit_log to accept routing events from request workflows
ALTER TABLE public.delegation_audit_log DROP CONSTRAINT IF EXISTS delegation_audit_log_action_check;
ALTER TABLE public.delegation_audit_log DROP CONSTRAINT IF EXISTS delegation_audit_log_source_table_check;

ALTER TABLE public.delegation_audit_log
  ADD CONSTRAINT delegation_audit_log_action_check
  CHECK (action = ANY (ARRAY['create','update','delete','activate','deactivate','route','substitute','skip']));

ALTER TABLE public.delegation_audit_log
  ADD CONSTRAINT delegation_audit_log_source_table_check
  CHECK (source_table = ANY (ARRAY['authority_matrix','delegation_matrix','fuel_request','trip_request','outsource_payment_request']));

-- Refactor fuel request routing to emit delegation_audit_log entries
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
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.fuel_requests WHERE id = p_fuel_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Fuel request not found';
  END IF;

  v_org_id := v_request.organization_id;
  v_cost := COALESCE(v_request.estimated_cost, 0)::numeric;
  v_request_label := COALESCE(v_request.request_number, p_fuel_request_id::text);

  SELECT email INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;

  -- Reset chain
  DELETE FROM public.fuel_request_approvals WHERE fuel_request_id = p_fuel_request_id;

  FOR v_rule IN
    SELECT approver_role, step_order, rule_name, min_amount, max_amount
    FROM public.authority_matrix
    WHERE organization_id = v_org_id
      AND scope = 'fuel_request'
      AND is_active = true
      AND (min_amount IS NULL OR v_cost >= min_amount)
      AND (max_amount IS NULL OR v_cost <= max_amount)
    ORDER BY step_order ASC, priority ASC
  LOOP
    SELECT ur.user_id INTO v_approver_id
    FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.role::text = v_rule.approver_role
      AND ur.user_id != v_request.requested_by
    LIMIT 1;

    IF v_approver_id IS NULL THEN
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'skip', v_rule.rule_name, 'fuel_request',
        format('Skipped rule "%s" – no user with role %s available', v_rule.rule_name, v_rule.approver_role),
        jsonb_build_object('rule_name', v_rule.rule_name, 'role', v_rule.approver_role,
                           'step_order', v_rule.step_order, 'cost', v_cost,
                           'request_number', v_request_label),
        v_actor_id, v_actor_name
      );
      CONTINUE;
    END IF;

    SELECT email INTO v_approver_name FROM public.profiles WHERE id = v_approver_id;
    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);

    IF v_delegate_id IS NOT NULL THEN
      SELECT email INTO v_delegate_name FROM public.profiles WHERE id = v_delegate_id;
      INSERT INTO public.delegation_audit_log (
        organization_id, source_table, source_id, action, entity_name, scope,
        summary, old_values, new_values, actor_id, actor_name
      ) VALUES (
        v_org_id, 'fuel_request', p_fuel_request_id, 'substitute', v_rule.rule_name, 'fuel_request',
        format('Step %s: %s → delegated to %s (rule "%s")',
               v_rule.step_order, COALESCE(v_approver_name, v_approver_id::text),
               COALESCE(v_delegate_name, v_delegate_id::text), v_rule.rule_name),
        jsonb_build_object('original_approver_id', v_approver_id, 'original_approver', v_approver_name),
        jsonb_build_object('delegate_id', v_delegate_id, 'delegate', v_delegate_name,
                           'role', v_rule.approver_role, 'step_order', v_rule.step_order,
                           'cost', v_cost, 'request_number', v_request_label),
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
      format('Step %s assigned to %s (%s) via rule "%s" — cost %s ETB',
             v_step, COALESCE(v_approver_name, v_approver_id::text),
             v_rule.approver_role, v_rule.rule_name, v_cost),
      jsonb_build_object('step', v_step, 'role', v_rule.approver_role,
                         'approver_id', v_approver_id, 'approver', v_approver_name,
                         'rule_name', v_rule.rule_name, 'cost', v_cost,
                         'request_number', v_request_label,
                         'min_amount', v_rule.min_amount, 'max_amount', v_rule.max_amount),
      v_actor_id, v_actor_name
    );
  END LOOP;

  -- Legacy fallback (unchanged behavior, but log the fallback)
  IF v_inserted = 0 THEN
    SELECT ur.user_id INTO v_approver_id FROM public.user_roles ur
    WHERE ur.organization_id = v_org_id AND ur.role = 'fleet_manager' AND ur.user_id != v_request.requested_by LIMIT 1;
    IF v_approver_id IS NULL THEN
      SELECT ur.user_id INTO v_approver_id FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id AND ur.role = 'operations_manager' AND ur.user_id != v_request.requested_by LIMIT 1;
    END IF;
    IF v_approver_id IS NULL THEN
      SELECT ur.user_id INTO v_approver_id FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id AND ur.role IN ('org_admin','super_admin') AND ur.user_id != v_request.requested_by LIMIT 1;
    END IF;
    IF v_approver_id IS NULL THEN RETURN 'no_approver_found'; END IF;

    v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
    IF v_delegate_id IS NOT NULL THEN v_approver_id := v_delegate_id; END IF;

    INSERT INTO public.fuel_request_approvals (organization_id, fuel_request_id, approver_id, approver_role, step, action)
    VALUES (v_org_id, p_fuel_request_id, v_approver_id, 'fleet_manager', 1, 'pending');

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope, summary, new_values, actor_id, actor_name
    ) VALUES (
      v_org_id, 'fuel_request', p_fuel_request_id, 'route', 'Legacy fallback', 'fuel_request',
      format('No matrix rule matched cost %s ETB — used legacy fleet_manager → operations_manager chain', v_cost),
      jsonb_build_object('cost', v_cost, 'request_number', v_request_label, 'fallback', true),
      v_actor_id, v_actor_name
    );

    IF v_cost > 5000 THEN
      SELECT ur.user_id INTO v_approver_id FROM public.user_roles ur
      WHERE ur.organization_id = v_org_id AND ur.role = 'operations_manager' AND ur.user_id != v_request.requested_by LIMIT 1;
      IF v_approver_id IS NOT NULL THEN
        v_delegate_id := public.get_active_delegate(v_approver_id, 'fuel_requests', v_cost);
        IF v_delegate_id IS NOT NULL THEN v_approver_id := v_delegate_id; END IF;
        INSERT INTO public.fuel_request_approvals (organization_id, fuel_request_id, approver_id, approver_role, step, action)
        VALUES (v_org_id, p_fuel_request_id, v_approver_id, 'operations_manager', 2, 'pending');
      END IF;
    END IF;
  END IF;

  RETURN 'routed';
END;
$function$;