CREATE OR REPLACE FUNCTION public.dispatch_incident_decision(
  p_incident_id uuid,
  p_decision text,
  p_replacement_vehicle uuid DEFAULT NULL,
  p_replacement_driver uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident incidents%ROWTYPE;
  v_request_id uuid;
  v_org uuid;
  v_user uuid := auth.uid();
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incident not found'; END IF;
  v_org := v_incident.organization_id;

  IF p_decision NOT IN ('continue','replacement','emergency') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

  IF p_decision = 'replacement' AND (p_replacement_vehicle IS NULL OR p_replacement_driver IS NULL) THEN
    RAISE EXCEPTION 'Both replacement vehicle and driver are required';
  END IF;

  -- Find active trip for this driver/vehicle
  SELECT id INTO v_request_id
  FROM vehicle_requests
  WHERE organization_id = v_org
    AND status IN ('assigned','approved','in_progress')
    AND (assigned_driver_id = v_incident.driver_id OR assigned_vehicle_id = v_incident.vehicle_id)
  ORDER BY assigned_at DESC NULLS LAST
  LIMIT 1;

  IF p_decision = 'continue' THEN
    UPDATE incidents SET
      dispatch_decision = 'allow_continue',
      dispatch_decision_at = now(),
      dispatch_decision_by = v_user,
      dispatch_decision_notes = p_notes,
      status = 'investigating',
      updated_at = now()
    WHERE id = p_incident_id;

  ELSIF p_decision = 'replacement' THEN
    IF v_request_id IS NOT NULL THEN
      UPDATE vehicle_requests SET
        assigned_vehicle_id = p_replacement_vehicle,
        assigned_driver_id  = p_replacement_driver,
        assigned_at = now(),
        updated_at = now()
      WHERE id = v_request_id;
    END IF;

    UPDATE incidents SET
      dispatch_decision = 'replacement_assigned',
      dispatch_decision_at = now(),
      dispatch_decision_by = v_user,
      dispatch_decision_notes = p_notes,
      replacement_vehicle_id = p_replacement_vehicle,
      replacement_driver_id  = p_replacement_driver,
      status = 'investigating',
      updated_at = now()
    WHERE id = p_incident_id;

  ELSE -- emergency
    UPDATE incidents SET
      dispatch_decision = 'emergency_escalated',
      dispatch_decision_at = now(),
      dispatch_decision_by = v_user,
      dispatch_decision_notes = p_notes,
      severity = 'critical',
      status = 'investigating',
      updated_at = now()
    WHERE id = p_incident_id;
  END IF;

  RETURN jsonb_build_object(
    'incident_id', p_incident_id,
    'decision', p_decision,
    'request_id', v_request_id
  );
END;
$$;