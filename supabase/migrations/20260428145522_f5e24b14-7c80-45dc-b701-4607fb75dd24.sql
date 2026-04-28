-- ============================================================================
-- 1. Schema additions for the continuation / dispatch-decision flow
-- ============================================================================

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS can_continue text,
  ADD COLUMN IF NOT EXISTS requested_assistance text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS dispatch_decision text,
  ADD COLUMN IF NOT EXISTS dispatch_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_decision_by uuid,
  ADD COLUMN IF NOT EXISTS dispatch_decision_notes text,
  ADD COLUMN IF NOT EXISTS replacement_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replacement_driver_id  uuid REFERENCES public.drivers(id)  ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_can_continue_check'
  ) THEN
    ALTER TABLE public.incidents
      ADD CONSTRAINT incidents_can_continue_check
      CHECK (can_continue IS NULL OR can_continue IN ('yes', 'no', 'emergency'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_dispatch_decision_check'
  ) THEN
    ALTER TABLE public.incidents
      ADD CONSTRAINT incidents_dispatch_decision_check
      CHECK (dispatch_decision IS NULL OR dispatch_decision IN ('continue', 'replacement_assigned', 'emergency'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_incidents_dispatch_decision
  ON public.incidents (organization_id, dispatch_decision)
  WHERE dispatch_decision IS NULL;

-- ============================================================================
-- 2. RPC: dispatch_incident_decision
--    Atomically applies the operator's decision and notifies the driver.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dispatch_incident_decision(
  p_incident_id uuid,
  p_decision text,                     -- 'continue' | 'replacement' | 'emergency'
  p_replacement_vehicle uuid DEFAULT NULL,
  p_replacement_driver  uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_org       uuid;
  v_incident  RECORD;
  v_trip      RECORD;
  v_dec       text;
  v_ticket_id uuid;
  v_drv_user  uuid;
  v_repl_user uuid;
  v_repl_plate text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Permission: any operational role in the org
  v_org := get_user_organization(v_uid);
  IF NOT (
    has_role(v_uid, 'super_admin'::app_role)
    OR has_role(v_uid, 'org_admin'::app_role)
    OR has_role(v_uid, 'fleet_manager'::app_role)
    OR has_role(v_uid, 'operations_manager'::app_role)
    OR has_role(v_uid, 'operator'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to dispatch incident decisions';
  END IF;

  SELECT * INTO v_incident FROM public.incidents
   WHERE id = p_incident_id AND organization_id = v_org;
  IF v_incident.id IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Normalise decision token
  v_dec := CASE lower(p_decision)
    WHEN 'continue' THEN 'continue'
    WHEN 'replacement' THEN 'replacement_assigned'
    WHEN 'replacement_assigned' THEN 'replacement_assigned'
    WHEN 'emergency' THEN 'emergency'
    ELSE NULL
  END;
  IF v_dec IS NULL THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  -- Resolve current driver's user_id for notifications
  IF v_incident.driver_id IS NOT NULL THEN
    SELECT user_id INTO v_drv_user FROM public.drivers WHERE id = v_incident.driver_id;
  END IF;

  -- ─────────── REPLACEMENT — swap the trip to new vehicle/driver ───────────
  IF v_dec = 'replacement_assigned' THEN
    IF p_replacement_vehicle IS NULL AND p_replacement_driver IS NULL THEN
      RAISE EXCEPTION 'Replacement requires at least a vehicle or a driver';
    END IF;

    -- Find the active trip linked to this incident (prefer trip_id, else latest active VR for the same driver/vehicle)
    SELECT * INTO v_trip FROM public.vehicle_requests
     WHERE id = v_incident.trip_id
       AND organization_id = v_org
       AND deleted_at IS NULL
     LIMIT 1;

    IF v_trip.id IS NULL AND v_incident.driver_id IS NOT NULL THEN
      SELECT * INTO v_trip FROM public.vehicle_requests
       WHERE assigned_driver_id = v_incident.driver_id
         AND organization_id = v_org
         AND status IN ('approved', 'in_progress')
         AND deleted_at IS NULL
       ORDER BY assigned_at DESC NULLS LAST, created_at DESC
       LIMIT 1;
    END IF;

    IF v_trip.id IS NOT NULL THEN
      UPDATE public.vehicle_requests
         SET assigned_vehicle_id = COALESCE(p_replacement_vehicle, assigned_vehicle_id),
             assigned_driver_id  = COALESCE(p_replacement_driver,  assigned_driver_id),
             assigned_by         = v_uid,
             assigned_at         = now(),
             updated_at          = now()
       WHERE id = v_trip.id;
    END IF;

    IF p_replacement_driver IS NOT NULL THEN
      SELECT user_id INTO v_repl_user FROM public.drivers WHERE id = p_replacement_driver;
    END IF;

    IF p_replacement_vehicle IS NOT NULL THEN
      SELECT plate_number INTO v_repl_plate FROM public.vehicles WHERE id = p_replacement_vehicle;
    END IF;
  END IF;

  -- ─────────── EMERGENCY — open high-priority follow-up ticket ─────────────
  IF v_dec = 'emergency' THEN
    INSERT INTO public.incident_tickets (
      organization_id, incident_id, ticket_number, ticket_type, priority, status,
      subject, description, vehicle_id, driver_id, created_by
    ) VALUES (
      v_org, v_incident.id,
      'EMG-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
      'emergency_response', 'urgent', 'open',
      'Emergency response — incident ' || v_incident.incident_number,
      COALESCE(p_notes, 'Operator escalated incident to emergency response queue.'),
      v_incident.vehicle_id, v_incident.driver_id, v_uid
    ) RETURNING id INTO v_ticket_id;

    UPDATE public.incidents
       SET severity = 'critical',
           status   = 'investigating'
     WHERE id = v_incident.id;
  END IF;

  -- ─────────── Persist decision on the incident itself ─────────────────────
  UPDATE public.incidents
     SET dispatch_decision        = v_dec,
         dispatch_decision_at     = now(),
         dispatch_decision_by     = v_uid,
         dispatch_decision_notes  = COALESCE(p_notes, dispatch_decision_notes),
         replacement_vehicle_id   = CASE WHEN v_dec = 'replacement_assigned' THEN p_replacement_vehicle ELSE replacement_vehicle_id END,
         replacement_driver_id    = CASE WHEN v_dec = 'replacement_assigned' THEN p_replacement_driver  ELSE replacement_driver_id  END,
         status                   = CASE
                                      WHEN v_dec = 'continue' THEN 'investigating'
                                      WHEN v_dec = 'replacement_assigned' THEN 'investigating'
                                      ELSE status
                                    END,
         updated_at = now()
   WHERE id = v_incident.id;

  -- ─────────── Notify the original driver in their inbox ──────────────────
  IF v_incident.driver_id IS NOT NULL THEN
    INSERT INTO public.driver_notifications (
      organization_id, driver_id, user_id, kind, title, body, link, payload
    ) VALUES (
      v_org, v_incident.driver_id, v_drv_user,
      'incident_dispatch_decision',
      CASE v_dec
        WHEN 'continue'             THEN 'Dispatch cleared you to continue'
        WHEN 'replacement_assigned' THEN 'Replacement vehicle dispatched'
        WHEN 'emergency'            THEN 'Emergency response activated'
      END,
      CASE v_dec
        WHEN 'continue'
          THEN 'Dispatch reviewed your report and approved you to continue the trip.'
        WHEN 'replacement_assigned'
          THEN 'A replacement is on the way' ||
               COALESCE(' • Vehicle ' || v_repl_plate, '') ||
               COALESCE(' • Note: ' || p_notes, '')
        WHEN 'emergency'
          THEN 'Stay safe — emergency response has been activated. Help is on the way.'
      END,
      '/driver-portal',
      jsonb_build_object(
        'incident_id', v_incident.id,
        'incident_number', v_incident.incident_number,
        'decision', v_dec,
        'replacement_vehicle_id', p_replacement_vehicle,
        'replacement_driver_id', p_replacement_driver,
        'replacement_vehicle_plate', v_repl_plate,
        'emergency_ticket_id', v_ticket_id,
        'notes', p_notes
      )
    );
  END IF;

  -- ─────────── Notify the replacement driver as well ──────────────────────
  IF v_dec = 'replacement_assigned' AND p_replacement_driver IS NOT NULL THEN
    INSERT INTO public.driver_notifications (
      organization_id, driver_id, user_id, kind, title, body, link, payload
    ) VALUES (
      v_org, p_replacement_driver, v_repl_user,
      'incident_replacement_assigned',
      'You have been assigned a replacement trip',
      'Dispatch assigned you to take over an in-progress trip due to an incident. Please open the trip in your portal.',
      '/driver-portal?tab=requests',
      jsonb_build_object(
        'incident_id', v_incident.id,
        'incident_number', v_incident.incident_number,
        'trip_id', COALESCE(v_trip.id, v_incident.trip_id),
        'notes', p_notes
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'incident_id', v_incident.id,
    'decision', v_dec,
    'emergency_ticket_id', v_ticket_id,
    'trip_id', COALESCE(v_trip.id, v_incident.trip_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_incident_decision(uuid, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_incident_decision(uuid, text, uuid, uuid, text) TO authenticated;