-- =====================================================================
-- FMG-VRQ 15 — Mirror legacy vehicle_requests into the workflow engine
-- (retry: typed ROWTYPE for backfill loop)
-- =====================================================================

ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid
    REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_workflow_stage text;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_workflow_instance
  ON public.vehicle_requests(workflow_instance_id);

-- 2) Helper: derive engine stage from a vehicle_requests row
CREATE OR REPLACE FUNCTION public._vrq_derive_stage(r public.vehicle_requests)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN r.deleted_at IS NOT NULL                                    THEN 'rejected'
    WHEN r.status = 'cancelled'                                      THEN 'rejected'
    WHEN r.status = 'rejected' OR r.approval_status = 'rejected'     THEN 'rejected'
    WHEN r.status = 'completed'
      OR r.auto_closed = true
      OR r.driver_checked_out_at IS NOT NULL                         THEN 'closed'
    WHEN r.driver_checked_in_at IS NOT NULL OR r.check_in_at IS NOT NULL
                                                                     THEN 'in_progress'
    WHEN r.assigned_vehicle_id IS NOT NULL                           THEN 'assigned'
    WHEN r.pool_review_status = 'reviewed'                           THEN 'awaiting_assignment'
    WHEN r.approval_status IN ('approved','auto_approved')
      OR r.status = 'approved'                                       THEN 'pool_review'
    ELSE 'submitted'
  END;
$$;

CREATE OR REPLACE FUNCTION public._vrq_stage_lane(_stage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _stage
    WHEN 'submitted'           THEN 'requestor'
    WHEN 'pending_approval'    THEN 'approver'
    WHEN 'rejected'            THEN 'approver'
    WHEN 'pool_review'         THEN 'pool'
    WHEN 'awaiting_assignment' THEN 'dispatch'
    WHEN 'assigned'            THEN 'driver'
    WHEN 'in_progress'         THEN 'driver'
    WHEN 'completed'           THEN 'requestor'
    WHEN 'closed'              THEN 'requestor'
    ELSE NULL
  END;
$$;

-- 3) INSERT trigger
CREATE OR REPLACE FUNCTION public._vrq_open_workflow_instance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref      text;
  _stage    text := 'submitted';
  _lane     text := 'requestor';
  _inst_id  uuid;
BEGIN
  IF NEW.workflow_instance_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT public.generate_workflow_reference(NEW.organization_id, 'vehicle_request')
      INTO _ref;
  EXCEPTION WHEN OTHERS THEN
    _ref := 'VRQ-' || substr(replace(NEW.id::text,'-',''), 1, 10);
  END;

  INSERT INTO public.workflow_instances (
    organization_id, workflow_type, reference_number,
    title, description, current_stage, current_lane,
    status, priority, vehicle_id, driver_id, created_by, data
  ) VALUES (
    NEW.organization_id, 'vehicle_request', _ref,
    COALESCE(NEW.purpose, NEW.request_number),
    NEW.purpose,
    _stage, _lane,
    'in_progress', COALESCE(NEW.priority, 'normal'),
    NEW.assigned_vehicle_id, NEW.assigned_driver_id, NEW.requester_id,
    jsonb_build_object(
      'request_number',  NEW.request_number,
      'request_type',    NEW.request_type,
      'pool_category',   NEW.pool_category,
      'pool_name',       NEW.pool_name,
      'needed_from',     NEW.needed_from,
      'needed_until',    NEW.needed_until,
      'departure_place', NEW.departure_place,
      'destination',     NEW.destination,
      'passengers',      NEW.passengers,
      'mirrored_from',   'vehicle_requests'
    )
  )
  RETURNING id INTO _inst_id;

  INSERT INTO public.workflow_transitions (
    organization_id, instance_id, workflow_type,
    from_stage, to_stage, from_lane, to_lane,
    decision, notes, performed_by, performed_by_name,
    payload
  ) VALUES (
    NEW.organization_id, _inst_id, 'vehicle_request',
    NULL, _stage, NULL, _lane,
    'create', 'Vehicle request filed (mirrored)', NEW.requester_id, NEW.requester_name,
    jsonb_build_object('request_id', NEW.id)
  );

  NEW.workflow_instance_id   := _inst_id;
  NEW.current_workflow_stage := _stage;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vrq_open_workflow_instance ON public.vehicle_requests;
CREATE TRIGGER trg_vrq_open_workflow_instance
  BEFORE INSERT ON public.vehicle_requests
  FOR EACH ROW
  EXECUTE FUNCTION public._vrq_open_workflow_instance();

-- 4) UPDATE trigger
CREATE OR REPLACE FUNCTION public._vrq_sync_workflow_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_stage    text;
  _old_stage    text;
  _new_lane     text;
  _old_lane     text;
  _decision     text;
  _terminal     boolean;
  _completed_at timestamptz;
  _payload      jsonb := '{}'::jsonb;
  _actor        uuid;
  _actor_name   text;
BEGIN
  IF NEW.workflow_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  _new_stage := public._vrq_derive_stage(NEW);
  _old_stage := COALESCE(OLD.current_workflow_stage, public._vrq_derive_stage(OLD));

  IF _new_stage = _old_stage THEN
    NEW.current_workflow_stage := _new_stage;
    RETURN NEW;
  END IF;

  _new_lane := public._vrq_stage_lane(_new_stage);
  _old_lane := public._vrq_stage_lane(_old_stage);
  _terminal := _new_stage IN ('rejected','closed');
  _completed_at := CASE WHEN _terminal THEN now() ELSE NULL END;

  _decision := CASE _new_stage
    WHEN 'pending_approval'    THEN 'route_for_approval'
    WHEN 'pool_review'         THEN 'approved'
    WHEN 'awaiting_assignment' THEN 'pool_reviewed'
    WHEN 'assigned'            THEN 'assigned_vehicle_driver'
    WHEN 'in_progress'         THEN 'driver_checkin'
    WHEN 'completed'           THEN 'driver_checkout'
    WHEN 'closed'              THEN 'closed'
    WHEN 'rejected'            THEN CASE
      WHEN NEW.deleted_at IS NOT NULL THEN 'deleted'
      WHEN NEW.status = 'cancelled'   THEN 'cancelled'
      ELSE 'rejected'
    END
    ELSE _new_stage
  END;

  _actor := COALESCE(
    NEW.deleted_by,
    NEW.pool_reviewer_id,
    NEW.assigned_by,
    NEW.check_in_by,
    NEW.requester_id
  );
  SELECT full_name INTO _actor_name FROM public.profiles WHERE id = _actor LIMIT 1;
  IF _actor_name IS NULL THEN _actor_name := COALESCE(NEW.requester_name, 'system'); END IF;

  _payload := jsonb_strip_nulls(jsonb_build_object(
    'request_id',                NEW.id,
    'request_number',            NEW.request_number,
    'status',                    NEW.status,
    'approval_status',           NEW.approval_status,
    'pool_review_status',        NEW.pool_review_status,
    'assigned_vehicle_id',       NEW.assigned_vehicle_id,
    'assigned_driver_id',        NEW.assigned_driver_id,
    'driver_checkin_odometer',   NEW.driver_checkin_odometer,
    'driver_checkout_odometer',  NEW.driver_checkout_odometer,
    'rejection_reason',          NEW.rejection_reason,
    'cancellation_reason',       NEW.cancellation_reason,
    'deletion_reason',           NEW.deletion_reason
  ));

  UPDATE public.workflow_instances SET
    current_stage = _new_stage,
    current_lane  = COALESCE(_new_lane, current_lane),
    status        = CASE WHEN _terminal THEN 'completed' ELSE 'in_progress' END,
    completed_at  = COALESCE(_completed_at, completed_at),
    vehicle_id    = COALESCE(NEW.assigned_vehicle_id, vehicle_id),
    driver_id     = COALESCE(NEW.assigned_driver_id, driver_id),
    data          = COALESCE(data, '{}'::jsonb) || _payload,
    updated_at    = now()
  WHERE id = NEW.workflow_instance_id;

  INSERT INTO public.workflow_transitions (
    organization_id, instance_id, workflow_type,
    from_stage, to_stage, from_lane, to_lane,
    decision, notes,
    performed_by, performed_by_name,
    payload
  ) VALUES (
    NEW.organization_id, NEW.workflow_instance_id, 'vehicle_request',
    _old_stage, _new_stage, _old_lane, _new_lane,
    _decision,
    'Mirrored from vehicle_requests',
    _actor, _actor_name,
    _payload
  );

  NEW.current_workflow_stage := _new_stage;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vrq_sync_workflow_stage ON public.vehicle_requests;
CREATE TRIGGER trg_vrq_sync_workflow_stage
  BEFORE UPDATE ON public.vehicle_requests
  FOR EACH ROW
  WHEN (
    OLD.status               IS DISTINCT FROM NEW.status
 OR OLD.approval_status      IS DISTINCT FROM NEW.approval_status
 OR OLD.pool_review_status   IS DISTINCT FROM NEW.pool_review_status
 OR OLD.assigned_vehicle_id  IS DISTINCT FROM NEW.assigned_vehicle_id
 OR OLD.assigned_driver_id   IS DISTINCT FROM NEW.assigned_driver_id
 OR OLD.driver_checked_in_at IS DISTINCT FROM NEW.driver_checked_in_at
 OR OLD.driver_checked_out_at IS DISTINCT FROM NEW.driver_checked_out_at
 OR OLD.auto_closed          IS DISTINCT FROM NEW.auto_closed
 OR OLD.deleted_at           IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION public._vrq_sync_workflow_stage();

-- 5) Backfill — typed ROWTYPE so _vrq_derive_stage(_r) compiles
DO $$
DECLARE
  _r     public.vehicle_requests%ROWTYPE;
  _ref   text;
  _stage text;
  _lane  text;
  _inst  uuid;
BEGIN
  FOR _r IN
    SELECT *
      FROM public.vehicle_requests
     WHERE workflow_instance_id IS NULL
       AND deleted_at IS NULL
  LOOP
    _stage := public._vrq_derive_stage(_r);
    _lane  := public._vrq_stage_lane(_stage);

    BEGIN
      SELECT public.generate_workflow_reference(_r.organization_id, 'vehicle_request')
        INTO _ref;
    EXCEPTION WHEN OTHERS THEN
      _ref := 'VRQ-BF-' || substr(replace(_r.id::text,'-',''), 1, 10);
    END;

    INSERT INTO public.workflow_instances (
      organization_id, workflow_type, reference_number,
      title, description, current_stage, current_lane,
      status, priority, vehicle_id, driver_id, created_by,
      completed_at, data
    ) VALUES (
      _r.organization_id, 'vehicle_request', _ref,
      COALESCE(_r.purpose, _r.request_number),
      _r.purpose,
      _stage, _lane,
      CASE WHEN _stage IN ('rejected','closed') THEN 'completed' ELSE 'in_progress' END,
      COALESCE(_r.priority, 'normal'),
      _r.assigned_vehicle_id, _r.assigned_driver_id, _r.requester_id,
      CASE WHEN _stage IN ('rejected','closed')
           THEN COALESCE(_r.completed_at, _r.cancelled_at, _r.deallocated_at, now())
           ELSE NULL END,
      jsonb_build_object(
        'request_number', _r.request_number,
        'request_type',   _r.request_type,
        'mirrored_from',  'vehicle_requests',
        'backfilled',     true
      )
    )
    RETURNING id INTO _inst;

    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, from_lane, to_lane,
      decision, notes,
      performed_by, performed_by_name,
      payload
    ) VALUES (
      _r.organization_id, _inst, 'vehicle_request',
      NULL, _stage, NULL, _lane,
      'backfill', 'Backfilled from existing vehicle_requests row',
      _r.requester_id, _r.requester_name,
      jsonb_build_object('request_id', _r.id, 'backfill', true)
    );

    UPDATE public.vehicle_requests
       SET workflow_instance_id   = _inst,
           current_workflow_stage = _stage
     WHERE id = _r.id;
  END LOOP;
END $$;