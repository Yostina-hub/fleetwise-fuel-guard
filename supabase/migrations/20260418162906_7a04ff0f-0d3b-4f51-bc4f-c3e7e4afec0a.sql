CREATE OR REPLACE FUNCTION public.mirror_delegation_audit_to_workflow_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_type TEXT;
  v_instance_id UUID;
  v_ref TEXT;
  v_perf_role TEXT;
  v_perf_name TEXT;
  v_perf_id UUID;
  v_assignee_id UUID;
  v_original_id UUID;
  v_actor_valid UUID;
BEGIN
  IF NEW.action NOT IN ('route','substitute','skip','activate','deactivate') THEN
    RETURN NEW;
  END IF;

  v_workflow_type := CASE NEW.source_table
    WHEN 'fuel_request' THEN 'fuel_request'
    WHEN 'trip_request' THEN 'vehicle_request'
    WHEN 'outsource_payment_request' THEN 'outsource_payment'
    ELSE NULL
  END;
  IF v_workflow_type IS NULL THEN RETURN NEW; END IF;

  -- Resolve workflow_instance via reference number
  IF NEW.source_table = 'fuel_request' AND NEW.source_id IS NOT NULL THEN
    SELECT request_number INTO v_ref FROM public.fuel_requests WHERE id = NEW.source_id;
    IF v_ref IS NOT NULL THEN
      SELECT id INTO v_instance_id
      FROM public.workflow_instances
      WHERE organization_id = NEW.organization_id
        AND workflow_type = 'fuel_request'
        AND reference_number = v_ref
      LIMIT 1;
    END IF;
  END IF;

  IF v_instance_id IS NULL THEN RETURN NEW; END IF;

  -- ROLE: assigned approver role from routing payload
  v_perf_role := COALESCE(
    NEW.new_values->>'resolved_role',
    NEW.new_values->>'approver_role',
    NEW.new_values->>'required_role'
  );

  -- USER ID: extract assigned approver id; only keep it if it exists in auth.users
  BEGIN
    v_assignee_id := NULLIF(NEW.new_values->>'approver_id','')::uuid;
  EXCEPTION WHEN others THEN v_assignee_id := NULL; END;

  BEGIN
    v_original_id := NULLIF(NEW.new_values->>'original_approver_id','')::uuid;
  EXCEPTION WHEN others THEN v_original_id := NULL; END;

  v_perf_id := COALESCE(v_assignee_id, v_original_id);

  IF v_perf_id IS NOT NULL THEN
    -- Validate FK to auth.users; if missing, drop it to avoid violation
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_perf_id) THEN
      v_perf_id := NULL;
    ELSE
      SELECT COALESCE(NULLIF(full_name,''), email) INTO v_perf_name
      FROM public.profiles WHERE id = v_perf_id;
    END IF;
  END IF;

  -- NAME: try embedded email/name from payload
  IF v_perf_name IS NULL THEN
    v_perf_name := COALESCE(
      NEW.new_values->>'approver',
      NEW.new_values->>'approver_email',
      NEW.new_values->>'approver_name',
      NEW.new_values->>'assignee_email',
      NEW.new_values->>'assignee_name'
    );
  END IF;

  -- Final fallback: actor (only if valid in auth.users)
  IF v_perf_id IS NULL AND NEW.actor_id IS NOT NULL THEN
    SELECT id INTO v_actor_valid FROM auth.users WHERE id = NEW.actor_id;
    v_perf_id := v_actor_valid;
  END IF;
  IF v_perf_name IS NULL THEN v_perf_name := NEW.actor_name; END IF;
  IF v_perf_role IS NULL THEN v_perf_role := NEW.scope; END IF;

  INSERT INTO public.workflow_transitions (
    organization_id, instance_id, workflow_type,
    from_stage, to_stage, decision, notes,
    performed_by, performed_by_name, performed_by_role, payload
  ) VALUES (
    NEW.organization_id, v_instance_id, v_workflow_type,
    'delegation_routing',
    NEW.action,
    NEW.action,
    NEW.summary,
    v_perf_id,
    v_perf_name,
    v_perf_role,
    jsonb_build_object(
      'source_table', NEW.source_table,
      'source_id', NEW.source_id,
      'entity_name', NEW.entity_name,
      'scope', NEW.scope,
      'actor_id', NEW.actor_id,
      'actor_name', NEW.actor_name,
      'old_values', NEW.old_values,
      'new_values', NEW.new_values
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'mirror_delegation_audit_to_workflow_transitions failed: %', SQLERRM;
  RETURN NEW;
END;
$$;