
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
  v_route_to TEXT;
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

  -- Auto-approve for operations_manager and above
  IF v_requester_role IN ('super_admin', 'org_admin', 'fleet_owner', 'fleet_manager', 'operations_manager') THEN
    UPDATE public.vehicle_requests 
    SET status = 'approved', approval_status = 'auto_approved', approval_routed_to = 'self',
        updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.vehicle_request_approvals (
      organization_id, request_id, approver_id, approver_name, approval_level,
      status, decision_at, comments
    ) VALUES (
      v_request.organization_id, p_request_id, v_request.requester_id, v_request.requester_name, 1,
      'approved', now(), 'Auto-approved: requester is ' || v_requester_role
    );

    RETURN 'auto_approved';
  END IF;

  -- Route based on duration
  IF v_duration_days <= 15 THEN
    v_route_to := 'operations_manager';
  ELSE
    v_route_to := 'org_admin';
  END IF;

  UPDATE public.vehicle_requests 
  SET approval_status = 'pending_approval', approval_routed_to = v_route_to,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN v_route_to;
END;
$function$;
