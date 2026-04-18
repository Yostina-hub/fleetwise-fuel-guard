-- Mirror delegation_audit_log routing/substitute/skip events into workflow_transitions
-- so the timeline UI on workflow detail drawers shows delegation routing alongside
-- normal stage transitions. Resolution map: source_table -> workflow_type & ref column.

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
BEGIN
  -- Only mirror routing-style decisions (skip create/update/delete on rules themselves)
  IF NEW.action NOT IN ('route','substitute','skip','activate','deactivate') THEN
    RETURN NEW;
  END IF;

  -- Map source_table -> workflow_type
  v_workflow_type := CASE NEW.source_table
    WHEN 'fuel_request' THEN 'fuel_request'
    WHEN 'trip_request' THEN 'vehicle_request'
    WHEN 'outsource_payment_request' THEN 'outsource_payment'
    ELSE NULL
  END;
  IF v_workflow_type IS NULL THEN RETURN NEW; END IF;

  -- Try to resolve workflow_instance by source_id (entity id) within same org
  -- Most fuel/trip workflow_instances use reference_number (e.g. FR-XXX) not entity id,
  -- so we look it up via the source table when possible.
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

  IF v_instance_id IS NULL THEN
    RETURN NEW; -- nothing to mirror against
  END IF;

  INSERT INTO public.workflow_transitions (
    organization_id, instance_id, workflow_type,
    from_stage, to_stage, decision, notes,
    performed_by, performed_by_name, payload
  ) VALUES (
    NEW.organization_id, v_instance_id, v_workflow_type,
    'delegation_routing',
    NEW.action,
    NEW.action,
    NEW.summary,
    NEW.actor_id,
    NEW.actor_name,
    jsonb_build_object(
      'source_table', NEW.source_table,
      'source_id', NEW.source_id,
      'entity_name', NEW.entity_name,
      'scope', NEW.scope,
      'old_values', NEW.old_values,
      'new_values', NEW.new_values
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break the originating insert
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_delegation_audit ON public.delegation_audit_log;
CREATE TRIGGER trg_mirror_delegation_audit
AFTER INSERT ON public.delegation_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.mirror_delegation_audit_to_workflow_transitions();

-- Helper to auto-decide a fuel WO + e-money approval pair, used by the
-- telebirr-emoney edge function in stub mode so delegation history is complete.
-- It approves all pending fuel_wo_approvals for a WO on behalf of the assigned
-- approver, then if amount provided creates+approves an emoney approval row.
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
BEGIN
  SELECT * INTO v_wo FROM public.fuel_work_orders WHERE id = p_wo_id;
  IF v_wo IS NULL THEN RAISE EXCEPTION 'Work order not found'; END IF;

  -- Approve all pending WO approval steps as the assigned approver (acting on behalf)
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

  -- Mark WO approved/released if all steps are now approved
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
    -- Reuse existing pending row if any
    SELECT id INTO v_emoney_app_id
    FROM public.fuel_emoney_approvals
    WHERE fuel_work_order_id = p_wo_id AND status = 'pending'
    LIMIT 1;

    IF v_emoney_app_id IS NULL THEN
      DECLARE
        v_user_id UUID;
        v_role TEXT := CASE WHEN p_emoney_amount > 5000 THEN 'operations_manager' ELSE 'fleet_manager' END;
      BEGIN
        SELECT user_id INTO v_user_id
        FROM public.user_roles
        WHERE organization_id = v_wo.organization_id AND role::text = v_role
        LIMIT 1;
        IF v_user_id IS NULL THEN
          SELECT user_id INTO v_user_id
          FROM public.user_roles
          WHERE organization_id = v_wo.organization_id AND role::text = 'fleet_manager'
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
      END;
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