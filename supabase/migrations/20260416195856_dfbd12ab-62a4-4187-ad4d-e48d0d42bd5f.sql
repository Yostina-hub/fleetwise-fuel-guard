
CREATE OR REPLACE FUNCTION public.run_drivers_page_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_user uuid := '087decd2-238d-4b18-bf82-c2b6981d99e8';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_driver_id uuid;
  v_vehicle uuid := '68be8a58-2d47-4311-9337-4d99de6b6cee';
  v_trip_id uuid;
  v_pre_trips int;
  v_pre_dist numeric;
  v_post_trips int;
  v_post_dist numeric;
  v_score_id uuid;
  v_att_id uuid;
  v_pen_id uuid;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);

  SELECT d.id INTO v_driver_id FROM public.drivers d WHERE d.user_id = v_user;
  IF v_driver_id IS NULL THEN
    INSERT INTO public.drivers (
      organization_id, user_id, first_name, last_name, email, phone,
      license_number, license_class, license_expiry, status, hire_date, employee_id, notes
    ) VALUES (
      v_org, v_user, 'E2E', 'Driver', 'e2e-driver@demo.et', '+251911000001',
      'E2E-LIC-' || substring(v_user::text from 1 for 6), 'B', current_date + interval '2 years',
      'active', current_date - interval '6 months', 'EMP-E2E-001',
      'E2E driver auto-provisioned'
    ) RETURNING id INTO v_driver_id;
    t_step:='driver_provision'; t_flow:='drivers'; t_status:='PASS'; t_detail:='created '||v_driver_id::text; RETURN NEXT;
  ELSE
    t_step:='driver_provision'; t_flow:='drivers'; t_status:='PASS'; t_detail:='exists '||v_driver_id::text; RETURN NEXT;
  END IF;

  UPDATE public.profiles
  SET linked_driver_id = v_driver_id, employee_type = COALESCE(employee_type, 'driver'), updated_at = now()
  WHERE id = v_user;
  t_step:='profile_link'; t_flow:='drivers'; t_status:='PASS'; t_detail:='profile linked'; RETURN NEXT;

  IF EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = v_driver_id AND d.organization_id = v_org AND d.status = 'active') THEN
    t_step:='list_visibility'; t_flow:='drivers'; t_status:='PASS'; t_detail:='visible to org list'; RETURN NEXT;
  ELSE
    t_step:='list_visibility'; t_flow:='drivers'; t_status:='FAIL'; t_detail:='not visible'; RETURN NEXT;
  END IF;

  -- Trip stats trigger
  SELECT COALESCE(d.total_trips, 0), COALESCE(d.total_distance_km, 0)
    INTO v_pre_trips, v_pre_dist FROM public.drivers d WHERE d.id = v_driver_id;

  INSERT INTO public.trips (
    organization_id, vehicle_id, driver_id, status, start_time
  ) VALUES (
    v_org, v_vehicle, v_driver_id, 'in_progress', now() - interval '2 hours'
  ) RETURNING id INTO v_trip_id;

  UPDATE public.trips SET status = 'completed', end_time = now(), distance_km = 42.5 WHERE id = v_trip_id;

  SELECT COALESCE(d.total_trips, 0), COALESCE(d.total_distance_km, 0)
    INTO v_post_trips, v_post_dist FROM public.drivers d WHERE d.id = v_driver_id;

  IF v_post_trips = v_pre_trips + 1 AND v_post_dist = v_pre_dist + 42.5 THEN
    t_step:='trip_stats_trigger'; t_flow:='drivers'; t_status:='PASS';
    t_detail:=format('trips %s->%s, dist %s->%s', v_pre_trips, v_post_trips, v_pre_dist, v_post_dist);
    RETURN NEXT;
  ELSE
    t_step:='trip_stats_trigger'; t_flow:='drivers'; t_status:='FAIL';
    t_detail:=format('expected +1 +42.5, got trips %s->%s, dist %s->%s', v_pre_trips, v_post_trips, v_pre_dist, v_post_dist);
    RETURN NEXT;
  END IF;

  -- Behavior score
  BEGIN
    INSERT INTO public.driver_behavior_scores (
      organization_id, driver_id, vehicle_id,
      score_period_start, score_period_end,
      overall_score, safety_rating,
      speeding_score, braking_score, acceleration_score, idle_score,
      speed_violations, harsh_braking_events, harsh_acceleration_events,
      total_drive_time, total_idle_time, total_distance, trend
    ) VALUES (
      v_org, v_driver_id, v_vehicle,
      now() - interval '7 days', now(),
      87, 'good', 90, 85, 88, 92, 0, 1, 2, 3600, 600, 250.5, 'improving'
    ) RETURNING id INTO v_score_id;
    t_step:='behavior_score'; t_flow:='drivers'; t_status:='PASS'; t_detail:=v_score_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='behavior_score'; t_flow:='drivers'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Attendance
  BEGIN
    INSERT INTO public.driver_attendance (
      organization_id, driver_id, date, status, source,
      check_in_time, check_out_time, total_hours
    ) VALUES (
      v_org, v_driver_id, current_date, 'present', 'manual',
      now() - interval '8 hours', now(), 8.0
    ) RETURNING id INTO v_att_id;
    t_step:='attendance'; t_flow:='drivers'; t_status:='PASS'; t_detail:=v_att_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='attendance'; t_flow:='drivers'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Penalty
  BEGIN
    INSERT INTO public.driver_penalties (
      organization_id, driver_id, violation_type, severity,
      penalty_points, violation_time, status
    ) VALUES (
      v_org, v_driver_id, 'speeding', 'minor', 5, now(), 'active'
    ) RETURNING id INTO v_pen_id;
    t_step:='penalty'; t_flow:='drivers'; t_status:='PASS'; t_detail:=v_pen_id::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='penalty'; t_flow:='drivers'; t_status:='FAIL'; t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Cleanup
  IF v_pen_id IS NOT NULL THEN DELETE FROM public.driver_penalties WHERE id = v_pen_id; END IF;
  IF v_att_id IS NOT NULL THEN DELETE FROM public.driver_attendance WHERE id = v_att_id; END IF;
  IF v_score_id IS NOT NULL THEN DELETE FROM public.driver_behavior_scores WHERE id = v_score_id; END IF;
  DELETE FROM public.trips WHERE id = v_trip_id;
  UPDATE public.drivers d SET total_trips = v_pre_trips, total_distance_km = v_pre_dist, updated_at = now()
  WHERE d.id = v_driver_id;
  t_step:='cleanup'; t_flow:='drivers'; t_status:='PASS'; t_detail:='artifacts removed, linkage retained'; RETURN NEXT;

  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_drivers_page_e2e_test() TO authenticated, service_role, supabase_read_only_user;

DO $$
DECLARE r record; v_run_at timestamptz := now();
BEGIN
  FOR r IN SELECT * FROM public.run_drivers_page_e2e_test() LOOP
    INSERT INTO public.e2e_test_runs (run_at, step, flow, status, detail)
    VALUES (v_run_at, r.t_step, r.t_flow, r.t_status, r.t_detail);
  END LOOP;
END $$;
