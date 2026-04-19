-- 1) Expand delegation_audit_log allowed actions + source tables
ALTER TABLE public.delegation_audit_log
  DROP CONSTRAINT IF EXISTS delegation_audit_log_action_check;
ALTER TABLE public.delegation_audit_log
  ADD CONSTRAINT delegation_audit_log_action_check
  CHECK (action = ANY (ARRAY[
    'create','update','delete','activate','deactivate',
    'route','substitute','skip',
    'approve','reject','escalate'
  ]));

ALTER TABLE public.delegation_audit_log
  DROP CONSTRAINT IF EXISTS delegation_audit_log_source_table_check;
ALTER TABLE public.delegation_audit_log
  ADD CONSTRAINT delegation_audit_log_source_table_check
  CHECK (source_table = ANY (ARRAY[
    'authority_matrix','delegation_matrix','user_substitutions','approval_levels',
    'fuel_request','trip_request','vehicle_request',
    'outsource_payment_request','tire_request','maintenance_request',
    'fuel_wo','work_order','fuel_emoney'
  ]));

-- Helper: resolve a friendly actor name
CREATE OR REPLACE FUNCTION public._approval_actor_name(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(p.full_name,''), NULLIF(concat_ws(' ', p.first_name, p.last_name),''), p.email, 'Unknown user')
  FROM public.profiles p WHERE p.id = _uid
$$;

-- 2) trip_approvals → log on UPDATE of action
CREATE OR REPLACE FUNCTION public.log_trip_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_req record;
  v_action text;
BEGIN
  IF NEW.action IS NULL OR NEW.action = COALESCE(OLD.action,'') OR NEW.action = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.action NOT IN ('approve','reject','escalate') THEN
    RETURN NEW;
  END IF;

  SELECT request_number, organization_id, purpose
    INTO v_req
  FROM public.trip_requests WHERE id = NEW.trip_request_id;

  v_actor := public._approval_actor_name(NEW.approver_id);
  v_action := CASE NEW.action WHEN 'approve' THEN 'approve' WHEN 'reject' THEN 'reject' ELSE 'escalate' END;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    v_req.organization_id, 'trip_request', NEW.trip_request_id, v_action,
    COALESCE(v_req.request_number, 'Trip Request'),
    'trip_request',
    format('Step %s %sed by %s%s', NEW.step,
      CASE NEW.action WHEN 'approve' THEN 'approv' WHEN 'reject' THEN 'reject' ELSE 'escalat' END,
      v_actor,
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN ' · ' || NEW.comment ELSE '' END),
    NEW.approver_id, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'step', NEW.step, 'action', NEW.action, 'comment', NEW.comment, 'acted_at', NEW.acted_at)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_trip_approval_audit ON public.trip_approvals;
CREATE TRIGGER trg_log_trip_approval_audit
AFTER UPDATE ON public.trip_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_trip_approval_audit();

-- 3) vehicle_request_approvals
CREATE OR REPLACE FUNCTION public.log_vehicle_request_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor text;
  v_req_no text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = COALESCE(OLD.status,'') OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved','rejected','escalated') THEN
    RETURN NEW;
  END IF;

  v_action := CASE NEW.status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' ELSE 'escalate' END;
  v_actor := COALESCE(NEW.approver_name, public._approval_actor_name(NEW.approver_id));

  SELECT request_number INTO v_req_no FROM public.vehicle_requests WHERE id = NEW.request_id;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    NEW.organization_id, 'vehicle_request', NEW.request_id, v_action,
    COALESCE(v_req_no, 'Vehicle Request'),
    'vehicle_request',
    format('Level %s %s by %s%s', COALESCE(NEW.approval_level,1), NEW.status, v_actor,
      CASE WHEN NEW.comments IS NOT NULL AND NEW.comments <> '' THEN ' · ' || NEW.comments ELSE '' END),
    NEW.approver_id, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'level', NEW.approval_level, 'status', NEW.status, 'comments', NEW.comments,
                       'delegated_from', NEW.delegated_from, 'delegated_from_name', NEW.delegated_from_name)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_vehicle_request_approval_audit ON public.vehicle_request_approvals;
CREATE TRIGGER trg_log_vehicle_request_approval_audit
AFTER UPDATE ON public.vehicle_request_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_request_approval_audit();

-- 4) fuel_wo_approvals
CREATE OR REPLACE FUNCTION public.log_fuel_wo_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor text;
  v_wo_no text;
BEGIN
  IF NEW.action IS NULL OR NEW.action = COALESCE(OLD.action,'') OR NEW.action = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.action NOT IN ('approve','approved','reject','rejected') THEN
    RETURN NEW;
  END IF;

  v_action := CASE WHEN NEW.action IN ('approve','approved') THEN 'approve' ELSE 'reject' END;
  v_actor  := public._approval_actor_name(NEW.approver_id);

  SELECT work_order_number INTO v_wo_no FROM public.fuel_work_orders WHERE id = NEW.fuel_work_order_id;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    NEW.organization_id, 'fuel_wo', NEW.fuel_work_order_id, v_action,
    COALESCE(v_wo_no, 'Fuel Work Order'),
    'fuel_wo',
    format('Step %s %s by %s (%s)%s', NEW.step, NEW.action, v_actor, NEW.approver_role,
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN ' · ' || NEW.comment ELSE '' END),
    NEW.approver_id, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'step', NEW.step, 'role', NEW.approver_role,
                       'is_delegated', NEW.is_delegated, 'original_approver_id', NEW.original_approver_id,
                       'comment', NEW.comment, 'acted_at', NEW.acted_at)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_fuel_wo_approval_audit ON public.fuel_wo_approvals;
CREATE TRIGGER trg_log_fuel_wo_approval_audit
AFTER UPDATE ON public.fuel_wo_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_fuel_wo_approval_audit();

-- 5) work_order_approvals (maintenance)
CREATE OR REPLACE FUNCTION public.log_work_order_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor text;
  v_wo_no text;
  v_level_name text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = COALESCE(OLD.status,'') OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved','rejected','delegated','escalated') THEN
    RETURN NEW;
  END IF;

  v_action := CASE NEW.status
    WHEN 'approved' THEN 'approve'
    WHEN 'rejected' THEN 'reject'
    WHEN 'delegated' THEN 'substitute'
    ELSE 'escalate'
  END;
  v_actor := public._approval_actor_name(NEW.approver_id);

  SELECT work_order_number INTO v_wo_no FROM public.work_orders WHERE id = NEW.work_order_id;
  SELECT level_name INTO v_level_name FROM public.approval_levels WHERE id = NEW.approval_level_id;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    NEW.organization_id, 'work_order', NEW.work_order_id, v_action,
    COALESCE(v_wo_no, 'Work Order'),
    'work_order',
    format('%s %s by %s%s', COALESCE(v_level_name,'Approval'), NEW.status, v_actor,
      CASE WHEN NEW.comments IS NOT NULL AND NEW.comments <> '' THEN ' · ' || NEW.comments ELSE '' END),
    NEW.approver_id, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'level', v_level_name, 'status', NEW.status,
                       'delegated_to', NEW.delegated_to, 'comments', NEW.comments,
                       'escalated', NEW.escalated, 'escalation_reason', NEW.escalation_reason)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_work_order_approval_audit ON public.work_order_approvals;
CREATE TRIGGER trg_log_work_order_approval_audit
AFTER UPDATE ON public.work_order_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_work_order_approval_audit();

-- 6) outsource_payment_approvals
CREATE OR REPLACE FUNCTION public.log_outsource_payment_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor text;
  v_ref text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = COALESCE(OLD.status,'') OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved','rejected','skipped') THEN
    RETURN NEW;
  END IF;

  v_action := CASE NEW.status
    WHEN 'approved' THEN 'approve'
    WHEN 'rejected' THEN 'reject'
    ELSE 'skip'
  END;
  v_actor := public._approval_actor_name(NEW.acted_by);

  SELECT COALESCE(request_number, id::text) INTO v_ref
  FROM public.outsource_payment_requests WHERE id = NEW.payment_request_id;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    NEW.organization_id, 'outsource_payment_request', NEW.payment_request_id, v_action,
    COALESCE(v_ref, 'Payment Request'),
    'outsource_payment',
    format('Step %s %s by %s (%s)%s', NEW.step_order, NEW.status, v_actor, NEW.approver_role,
      CASE WHEN NEW.comments IS NOT NULL AND NEW.comments <> '' THEN ' · ' || NEW.comments ELSE '' END),
    NEW.acted_by, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'step', NEW.step_order, 'role', NEW.approver_role,
                       'rule_name', NEW.rule_name, 'status', NEW.status, 'comments', NEW.comments)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_outsource_payment_approval_audit ON public.outsource_payment_approvals;
CREATE TRIGGER trg_log_outsource_payment_approval_audit
AFTER UPDATE ON public.outsource_payment_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_outsource_payment_approval_audit();

-- 7) fuel_emoney_approvals
CREATE OR REPLACE FUNCTION public.log_fuel_emoney_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor text;
  v_wo_no text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = COALESCE(OLD.status,'') OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN
    RETURN NEW;
  END IF;

  v_action := CASE NEW.status WHEN 'approved' THEN 'approve' ELSE 'reject' END;
  v_actor  := public._approval_actor_name(NEW.approver_id);

  SELECT work_order_number INTO v_wo_no FROM public.fuel_work_orders WHERE id = NEW.fuel_work_order_id;

  INSERT INTO public.delegation_audit_log (
    organization_id, source_table, source_id, action,
    entity_name, scope, summary, actor_id, actor_name, new_values
  ) VALUES (
    NEW.organization_id, 'fuel_emoney', NEW.fuel_work_order_id, v_action,
    COALESCE(v_wo_no, 'Fuel e-Money'),
    'fuel_emoney',
    format('e-Money %s of ETB %s %s by %s (%s)%s',
      CASE WHEN NEW.status = 'approved' THEN 'approval' ELSE 'rejection' END,
      NEW.amount, NEW.status, v_actor, NEW.approver_role,
      CASE WHEN NEW.comment IS NOT NULL AND NEW.comment <> '' THEN ' · ' || NEW.comment ELSE '' END),
    NEW.approver_id, v_actor,
    jsonb_build_object('approval_id', NEW.id, 'amount', NEW.amount, 'role', NEW.approver_role,
                       'is_delegated', NEW.is_delegated, 'original_approver_id', NEW.original_approver_id,
                       'status', NEW.status, 'comment', NEW.comment)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_fuel_emoney_approval_audit ON public.fuel_emoney_approvals;
CREATE TRIGGER trg_log_fuel_emoney_approval_audit
AFTER UPDATE ON public.fuel_emoney_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_fuel_emoney_approval_audit();

-- 8) Backfill historical approvals so the History tab is populated immediately
-- Trip approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT tr.organization_id, 'trip_request', ta.trip_request_id,
  CASE ta.action WHEN 'approve' THEN 'approve' WHEN 'reject' THEN 'reject' ELSE 'escalate' END,
  COALESCE(tr.request_number,'Trip Request'),
  'trip_request',
  format('Step %s %s by %s', ta.step, ta.action, public._approval_actor_name(ta.approver_id)),
  ta.approver_id, public._approval_actor_name(ta.approver_id),
  COALESCE(ta.acted_at, ta.created_at),
  jsonb_build_object('approval_id', ta.id, 'step', ta.step, 'action', ta.action, 'comment', ta.comment, 'backfilled', true)
FROM public.trip_approvals ta
JOIN public.trip_requests tr ON tr.id = ta.trip_request_id
WHERE ta.action IN ('approve','reject','escalate')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='trip_request' AND d.source_id = ta.trip_request_id
      AND (d.new_values->>'approval_id') = ta.id::text
  );

-- Vehicle request approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT a.organization_id, 'vehicle_request', a.request_id,
  CASE a.status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' ELSE 'escalate' END,
  COALESCE(vr.request_number,'Vehicle Request'),
  'vehicle_request',
  format('Level %s %s by %s', COALESCE(a.approval_level,1), a.status, COALESCE(a.approver_name, public._approval_actor_name(a.approver_id))),
  a.approver_id, COALESCE(a.approver_name, public._approval_actor_name(a.approver_id)),
  COALESCE(a.decision_at, a.created_at),
  jsonb_build_object('approval_id', a.id, 'level', a.approval_level, 'status', a.status, 'backfilled', true)
FROM public.vehicle_request_approvals a
JOIN public.vehicle_requests vr ON vr.id = a.request_id
WHERE a.status IN ('approved','rejected','escalated')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='vehicle_request' AND d.source_id = a.request_id
      AND (d.new_values->>'approval_id') = a.id::text
  );

-- Fuel work order approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT a.organization_id, 'fuel_wo', a.fuel_work_order_id,
  CASE WHEN a.action IN ('approve','approved') THEN 'approve' ELSE 'reject' END,
  COALESCE(wo.work_order_number,'Fuel Work Order'),
  'fuel_wo',
  format('Step %s %s by %s (%s)', a.step, a.action, public._approval_actor_name(a.approver_id), a.approver_role),
  a.approver_id, public._approval_actor_name(a.approver_id),
  COALESCE(a.acted_at, a.created_at),
  jsonb_build_object('approval_id', a.id, 'step', a.step, 'role', a.approver_role, 'backfilled', true)
FROM public.fuel_wo_approvals a
JOIN public.fuel_work_orders wo ON wo.id = a.fuel_work_order_id
WHERE a.action IN ('approve','approved','reject','rejected')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='fuel_wo' AND d.source_id = a.fuel_work_order_id
      AND (d.new_values->>'approval_id') = a.id::text
  );

-- Maintenance work order approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT a.organization_id, 'work_order', a.work_order_id,
  CASE a.status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' WHEN 'delegated' THEN 'substitute' ELSE 'escalate' END,
  COALESCE(wo.work_order_number,'Work Order'),
  'work_order',
  format('%s by %s', a.status, public._approval_actor_name(a.approver_id)),
  a.approver_id, public._approval_actor_name(a.approver_id),
  COALESCE(a.decision_at, a.created_at),
  jsonb_build_object('approval_id', a.id, 'status', a.status, 'backfilled', true)
FROM public.work_order_approvals a
JOIN public.work_orders wo ON wo.id = a.work_order_id
WHERE a.status IN ('approved','rejected','delegated','escalated')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='work_order' AND d.source_id = a.work_order_id
      AND (d.new_values->>'approval_id') = a.id::text
  );

-- Outsource payment approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT a.organization_id, 'outsource_payment_request', a.payment_request_id,
  CASE a.status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' ELSE 'skip' END,
  COALESCE(pr.request_number, a.payment_request_id::text),
  'outsource_payment',
  format('Step %s %s by %s (%s)', a.step_order, a.status, public._approval_actor_name(a.acted_by), a.approver_role),
  a.acted_by, public._approval_actor_name(a.acted_by),
  COALESCE(a.acted_at, a.created_at),
  jsonb_build_object('approval_id', a.id, 'step', a.step_order, 'role', a.approver_role, 'status', a.status, 'backfilled', true)
FROM public.outsource_payment_approvals a
JOIN public.outsource_payment_requests pr ON pr.id = a.payment_request_id
WHERE a.status IN ('approved','rejected','skipped')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='outsource_payment_request' AND d.source_id = a.payment_request_id
      AND (d.new_values->>'approval_id') = a.id::text
  );

-- Fuel e-money approvals
INSERT INTO public.delegation_audit_log (organization_id, source_table, source_id, action, entity_name, scope, summary, actor_id, actor_name, created_at, new_values)
SELECT a.organization_id, 'fuel_emoney', a.fuel_work_order_id,
  CASE a.status WHEN 'approved' THEN 'approve' ELSE 'reject' END,
  COALESCE(wo.work_order_number,'Fuel e-Money'),
  'fuel_emoney',
  format('e-Money ETB %s %s by %s (%s)', a.amount, a.status, public._approval_actor_name(a.approver_id), a.approver_role),
  a.approver_id, public._approval_actor_name(a.approver_id),
  COALESCE(a.acted_at, a.created_at),
  jsonb_build_object('approval_id', a.id, 'amount', a.amount, 'role', a.approver_role, 'status', a.status, 'backfilled', true)
FROM public.fuel_emoney_approvals a
JOIN public.fuel_work_orders wo ON wo.id = a.fuel_work_order_id
WHERE a.status IN ('approved','rejected')
  AND NOT EXISTS (
    SELECT 1 FROM public.delegation_audit_log d
    WHERE d.source_table='fuel_emoney' AND d.source_id = a.fuel_work_order_id
      AND (d.new_values->>'approval_id') = a.id::text
  );