CREATE OR REPLACE FUNCTION public.log_fuel_request_approval_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_request_number text;
  v_scope text;
  v_action_label text;
BEGIN
  IF NEW.action IS NULL
     OR NEW.action = COALESCE(OLD.action, '')
     OR NEW.action NOT IN ('approve', 'approved', 'reject', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name
    INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.approver_id;

  SELECT fr.request_number, fr.request_type
    INTO v_request_number, v_scope
  FROM public.fuel_requests fr
  WHERE fr.id = NEW.fuel_request_id;

  v_action_label := CASE
    WHEN NEW.action IN ('approve', 'approved') THEN 'activate'
    ELSE 'deactivate'
  END;

  INSERT INTO public.delegation_audit_log (
    organization_id,
    source_table,
    source_id,
    action,
    entity_name,
    scope,
    summary,
    actor_id,
    actor_name,
    new_values
  ) VALUES (
    NEW.organization_id,
    'fuel_request',
    NEW.fuel_request_id,
    v_action_label,
    COALESCE(v_request_number, 'Fuel Request'),
    v_scope,
    CASE
      WHEN NEW.action IN ('approve', 'approved') THEN format('Approval step %s completed by %s (%s)', NEW.step, COALESCE(v_actor_name, 'Unknown user'), NEW.approver_role)
      ELSE format('Approval step %s rejected by %s (%s)', NEW.step, COALESCE(v_actor_name, 'Unknown user'), NEW.approver_role)
    END,
    NEW.approver_id,
    COALESCE(v_actor_name, 'Unknown user'),
    jsonb_build_object(
      'approval_id', NEW.id,
      'fuel_request_id', NEW.fuel_request_id,
      'step', NEW.step,
      'approver_role', NEW.approver_role,
      'action', NEW.action,
      'comment', NEW.comment,
      'acted_at', NEW.acted_at
    )
  );

  RETURN NEW;
END;
$$;