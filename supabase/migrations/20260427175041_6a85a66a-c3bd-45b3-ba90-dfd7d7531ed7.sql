
CREATE OR REPLACE FUNCTION public._e2e_assign_and_feedback(
  _parent_id uuid,
  _req_a_id  uuid,
  _req_b_id  uuid,
  _vehicle_id uuid,
  _driver_id  uuid,
  _dispatcher_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  -- Only super_admins may run this internal helper
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role::text = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  -- Step 4: dispatcher assigns vehicle + driver to parent
  UPDATE vehicle_requests
  SET assigned_vehicle_id = _vehicle_id,
      assigned_driver_id  = _driver_id,
      assigned_by         = _dispatcher_id,
      assigned_at         = now(),
      status              = 'assigned',
      approval_status     = 'approved',
      dispatcher_notes    = 'Consolidated trip: pickup Aman at Megenagna en route from Bole to Kazanchis, then continue to Sidist Kilo.'
  WHERE id = _parent_id;

  -- Step 5: simulate completion
  UPDATE vehicle_requests
  SET driver_checked_in_at  = now() - interval '3 hours',
      driver_checked_out_at = now() - interval '15 minutes',
      status                = 'completed',
      completed_at          = now() - interval '10 minutes',
      distance_log_km       = 14.7
  WHERE id = _parent_id;

  -- Step 6a: Roba's feedback on parent
  UPDATE vehicle_requests
  SET driver_rating = 5, vehicle_rating = 4, punctuality_rating = 5,
      requester_rating = 5,
      requester_feedback = 'Roba: Smooth consolidated ride. Driver Henok was professional, picked up Aman at Megenagna without delay.',
      rating_comment = 'Great experience sharing the ride.',
      rated_at = now()
  WHERE id = _parent_id;

  -- Step 6b: Aman's feedback on his merged child
  UPDATE vehicle_requests
  SET driver_rating = 4, vehicle_rating = 4, punctuality_rating = 4,
      requester_rating = 4,
      requester_feedback = 'Aman: Pickup at Megenagna was on time. NISSAN was clean. Drop at Sidist Kilo went well — appreciate the shared ride saving fuel.',
      rating_comment = 'Happy with consolidation; would do again.',
      rated_at = now()
  WHERE id = _req_b_id;

  SELECT jsonb_build_object(
    'parent', (SELECT to_jsonb(v) FROM (
      SELECT request_number, status, assigned_at, driver_rating, vehicle_rating,
             punctuality_rating, requester_feedback
      FROM vehicle_requests WHERE id = _parent_id) v),
    'child_a', (SELECT to_jsonb(v) FROM (
      SELECT request_number, status, requester_name, requester_feedback
      FROM vehicle_requests WHERE id = _req_a_id) v),
    'child_b', (SELECT to_jsonb(v) FROM (
      SELECT request_number, status, requester_name, requester_feedback,
             driver_rating, vehicle_rating, punctuality_rating
      FROM vehicle_requests WHERE id = _req_b_id) v)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public._e2e_assign_and_feedback(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._e2e_assign_and_feedback(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;
