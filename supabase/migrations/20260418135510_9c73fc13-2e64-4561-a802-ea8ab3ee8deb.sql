CREATE OR REPLACE FUNCTION public.route_vehicle_request_approval(p_request_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_requester_role TEXT;
  v_duration_days INTEGER;
  v_resolved RECORD;
  v_route_to TEXT;
  v_actor_name TEXT;
  v_approver_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.vehicle_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.needed_until IS NOT NULL THEN
    v_duration_days := EXTRACT(DAY FROM (v_request.needed_until::timestamp - v_request.needed_from::timestamp)) + 1;
  ELSE
    v_duration_days := 1;
  END IF;

  UPDATE public.vehicle_requests SET trip_duration_days = v_duration_days WHERE id = p_request_id;

  SELECT ur.role::text INTO v_requester_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_request.requester_id
  ORDER BY CASE ur.role::text
    WHEN 'super_admin' THEN 1
    WHEN 'org_admin' THEN 2
    WHEN 'fleet_owner' THEN 3
    WHEN 'fleet_manager' THEN 4
    WHEN 'operations_manager' THEN 5
    ELSE 10
  END
  LIMIT 1;

  PERFORM public.seed_authority_matrix_defaults(v_request.organization_id);

  SELECT * INTO v_resolved
  FROM public.resolve_authority_approver(
    v_request.organization_id, 'vehicle_request', v_requester_role, 0, v_duration_days
  )
  ORDER BY step_order ASC
  LIMIT 1;

  -- Resolve actor name for audit log
  SELECT COALESCE(p.full_name, p.email, 'System') INTO v_actor_name
  FROM public.profiles p WHERE p.id = auth.uid();
  IF v_actor_name IS NULL THEN v_actor_name := 'System'; END IF;

  -- Auto-approve case
  IF v_resolved.is_auto_approve THEN
    UPDATE public.vehicle_requests 
    SET status = 'approved', approval_status = 'auto_approved', approval_routed_to = 'self',
        updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.vehicle_request_approvals (
      organization_id, request_id, approver_id, approver_name, approval_level,
      status, decision_at, comments
    ) VALUES (
      v_request.organization_id, p_request_id, v_request.requester_id, v_request.requester_name, 1,
      'approved', now(), 'Auto-approved per Authority Matrix: requester is ' || v_requester_role
    );

    INSERT INTO public.delegation_audit_log (
      organization_id, source_table, source_id, action, entity_name, scope, summary,
      old_values, new_values, actor_id, actor_name
    ) VALUES (
      v_request.organization_id, 'vehicle_request', p_request_id, 'route',
      v_request.request_number, 'vehicle_request',
      format('Auto-approved: requester role %s qualifies per Authority Matrix (trip duration %s day(s))',
             COALESCE(v_requester_role,'unknown'), v_duration_days),
      NULL,
      jsonb_build_object(
        'request_number', v_request.request_number,
        'requester_role', v_requester_role,
        'trip_duration_days', v_duration_days,
        'rule_name', COALESCE(v_resolved.rule_name, 'auto_approve'),
        'resolved_role', 'self',
        'auto_approved', true
      ),
      auth.uid(), v_actor_name
    );

    RETURN 'auto_approved';
  END IF;

  -- Fallback if no matrix rule matched
  IF v_resolved.approver_role IS NULL THEN
    v_route_to := CASE WHEN v_duration_days <= 15 THEN 'operations_manager' ELSE 'org_admin' END;
  ELSE
    v_route_to := v_resolved.approver_role;
  END IF;

  UPDATE public.vehicle_requests 
  SET approval_status = 'pending_approval', approval_routed_to = v_route_to,
      updated_at = now()
  WHERE id = p_request_id;

  -- Log routing decision
  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action, entity_name, scope, summary,
    old_values, new_values, actor_id, actor_name
  ) VALUES (
    v_request.organization_id, 'vehicle_request', p_request_id, 'route',
    v_request.request_number, 'vehicle_request',
    format('Routed to %s via Authority Matrix rule "%s" (trip duration %s day(s), requester role %s)',
           v_route_to,
           COALESCE(v_resolved.rule_name, 'fallback'),
           v_duration_days,
           COALESCE(v_requester_role, 'unknown')),
    NULL,
    jsonb_build_object(
      'request_number', v_request.request_number,
      'requester_role', v_requester_role,
      'trip_duration_days', v_duration_days,
      'rule_name', COALESCE(v_resolved.rule_name, 'fallback'),
      'resolved_role', v_route_to,
      'step', COALESCE(v_resolved.step_order, 1)
    ),
    auth.uid(), v_actor_name
  );

  RETURN v_route_to;
END;
$function$;