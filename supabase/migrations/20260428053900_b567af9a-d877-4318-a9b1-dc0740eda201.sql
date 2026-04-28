-- E2E test runner for dispatch jobs lifecycle
CREATE OR REPLACE FUNCTION public.run_dispatch_jobs_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_vehicle uuid;
  v_driver uuid;
  v_job uuid;
  v_job_no text := 'E2E-DJ-'||substr(md5(random()::text),1,8);
  v_status text;
  v_dispatched_at timestamptz;
  v_completed_at timestamptz;
  v_pod uuid;
BEGIN
  SELECT v.organization_id, v.id, d.id
    INTO v_org, v_vehicle, v_driver
  FROM vehicles v
  JOIN drivers d ON d.organization_id = v.organization_id
  WHERE COALESCE(v.status,'active')='active' AND COALESCE(d.status,'active')='active'
  LIMIT 1;

  IF v_org IS NULL THEN
    RETURN QUERY SELECT 'setup','dispatch','FAIL','No active vehicle+driver pair available';
    RETURN;
  END IF;
  RETURN QUERY SELECT 'setup','dispatch','PASS', format('org=%s veh=%s drv=%s', v_org, v_vehicle, v_driver);

  -- Step 1: Create pending job
  INSERT INTO dispatch_jobs(organization_id, job_number, job_type, status, priority,
      customer_name, pickup_location_name, dropoff_location_name, special_instructions)
  VALUES (v_org, v_job_no, 'delivery', 'pending', 'high',
      'E2E Customer','Bole Airport','Kazanchis HQ','Automated E2E test')
  RETURNING id INTO v_job;
  RETURN QUERY SELECT 'create_pending','dispatch','PASS', 'job='||v_job::text;

  -- Step 2: Assign vehicle + driver -> dispatched
  UPDATE dispatch_jobs SET vehicle_id=v_vehicle, driver_id=v_driver,
      status='dispatched', dispatched_at=now()
  WHERE id=v_job;
  SELECT status, dispatched_at INTO v_status, v_dispatched_at FROM dispatch_jobs WHERE id=v_job;
  IF v_status='dispatched' AND v_dispatched_at IS NOT NULL THEN
    RETURN QUERY SELECT 'assign_dispatch','dispatch','PASS', 'dispatched_at set';
  ELSE
    RETURN QUERY SELECT 'assign_dispatch','dispatch','FAIL', format('status=%s dispatched_at=%s', v_status, v_dispatched_at);
  END IF;

  -- Step 3: en_route
  UPDATE dispatch_jobs SET status='en_route', actual_pickup_at=now() WHERE id=v_job;
  SELECT status INTO v_status FROM dispatch_jobs WHERE id=v_job;
  RETURN QUERY SELECT 'en_route','dispatch', CASE WHEN v_status='en_route' THEN 'PASS' ELSE 'FAIL' END, 'status='||v_status;

  -- Step 4: arrived
  UPDATE dispatch_jobs SET status='arrived' WHERE id=v_job;
  SELECT status INTO v_status FROM dispatch_jobs WHERE id=v_job;
  RETURN QUERY SELECT 'arrived','dispatch', CASE WHEN v_status='arrived' THEN 'PASS' ELSE 'FAIL' END, 'status='||v_status;

  -- Step 5: completed
  UPDATE dispatch_jobs SET status='completed', completed_at=now(), actual_dropoff_at=now() WHERE id=v_job;
  SELECT status, completed_at INTO v_status, v_completed_at FROM dispatch_jobs WHERE id=v_job;
  IF v_status='completed' AND v_completed_at IS NOT NULL THEN
    RETURN QUERY SELECT 'completed','dispatch','PASS', 'completed_at set';
  ELSE
    RETURN QUERY SELECT 'completed','dispatch','FAIL', format('status=%s completed_at=%s', v_status, v_completed_at);
  END IF;

  -- Step 6: POD capture
  BEGIN
    INSERT INTO dispatch_pod(organization_id, job_id, recipient_name, notes)
    VALUES (v_org, v_job, 'E2E Recipient','Signed and delivered')
    RETURNING id INTO v_pod;
    RETURN QUERY SELECT 'pod_capture','dispatch','PASS', 'pod='||v_pod::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'pod_capture','dispatch','FAIL', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM dispatch_pod WHERE job_id=v_job;
  DELETE FROM dispatch_jobs WHERE id=v_job;
  RETURN QUERY SELECT 'cleanup','dispatch','PASS','rows removed';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_dispatch_jobs_e2e_test()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dispatch_pod WHERE job_id IN (SELECT id FROM dispatch_jobs WHERE job_number LIKE 'E2E-DJ-%');
  DELETE FROM dispatch_jobs WHERE job_number LIKE 'E2E-DJ-%';
END;
$$;

REVOKE ALL ON FUNCTION public.run_dispatch_jobs_e2e_test() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_dispatch_jobs_e2e_test() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_dispatch_jobs_e2e_test() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_dispatch_jobs_e2e_test() TO service_role;