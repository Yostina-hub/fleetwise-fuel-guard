-- =============================================================
-- E2E test for Driver License Renewal workflow (FMG-LIC 13)
-- Stages: request → verify → ta_processing → pay_fees → issued
-- =============================================================
CREATE OR REPLACE FUNCTION public.run_license_renewal_e2e_test()
RETURNS TABLE(t_step text, t_flow text, t_status text, t_detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org      uuid := '00000000-0000-0000-0000-000000000001';
  v_fleetops uuid := 'df16b315-ff5e-4acb-9489-b9dd6df83513';
  v_driver   uuid;
  v_inst_id  uuid;
  v_ref      text;
  v_stage    text;
BEGIN
  PERFORM public.e2e_set_user(v_fleetops);

  SELECT id INTO v_driver FROM public.drivers WHERE organization_id = v_org LIMIT 1;
  IF v_driver IS NULL THEN
    t_step:='0_setup'; t_flow:='license'; t_status:='FAIL';
    t_detail:='no driver in org'; RETURN NEXT;
    RETURN;
  END IF;

  v_ref := 'LIC-E2E-' || to_char(now(), 'YYMMDDHH24MISS');

  -- Step 1: create renewal request (workflow_instance @ stage=request)
  BEGIN
    INSERT INTO public.workflow_instances (
      organization_id, workflow_type, reference_number, title, description,
      current_stage, current_lane, status, priority, driver_id, created_by, data
    ) VALUES (
      v_org, 'license_renewal', v_ref, 'E2E License Renewal',
      'E2E test of driver license renewal workflow',
      'request', 'driver', 'in_progress', 'normal',
      v_driver, v_fleetops,
      jsonb_build_object(
        'license_type','driver',
        'current_expiry', (now() + interval '30 days')::date
      )
    ) RETURNING id INTO v_inst_id;
    t_step:='1_create_request'; t_flow:='license'; t_status:='PASS';
    t_detail:='created '||v_ref; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='1_create_request'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
    RETURN;
  END;

  -- Step 2: verify documents → stage=verify (lane=fleet_ops)
  BEGIN
    UPDATE public.workflow_instances
       SET current_stage='verify', current_lane='fleet_ops', updated_at=now()
     WHERE id=v_inst_id;
    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, from_lane, to_lane,
      decision, performed_by, performed_by_name
    ) VALUES (
      v_org, v_inst_id, 'license_renewal',
      'request','verify','driver','fleet_ops',
      'verify', v_fleetops, 'E2E Fleet Ops'
    );
    t_step:='2_verify_docs'; t_flow:='license'; t_status:='PASS';
    t_detail:='documents verified'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='2_verify_docs'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 3: submit to Transport Authority → stage=ta_processing
  BEGIN
    UPDATE public.workflow_instances
       SET current_stage='ta_processing', current_lane='transport', updated_at=now()
     WHERE id=v_inst_id;
    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, from_lane, to_lane,
      decision, performed_by, performed_by_name
    ) VALUES (
      v_org, v_inst_id, 'license_renewal',
      'verify','ta_processing','fleet_ops','transport',
      'submit_ta', v_fleetops, 'E2E Fleet Ops'
    );
    t_step:='3_submit_ta'; t_flow:='license'; t_status:='PASS';
    t_detail:='submitted to TA'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='3_submit_ta'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 4: TA approves → stage=pay_fees
  BEGIN
    UPDATE public.workflow_instances
       SET current_stage='pay_fees', current_lane='finance', updated_at=now()
     WHERE id=v_inst_id;
    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, from_lane, to_lane,
      decision, performed_by, performed_by_name
    ) VALUES (
      v_org, v_inst_id, 'license_renewal',
      'ta_processing','pay_fees','transport','finance',
      'approve', v_fleetops, 'E2E TA'
    );
    t_step:='4_ta_approve'; t_flow:='license'; t_status:='PASS';
    t_detail:='TA approved → fees due'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='4_ta_approve'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 5: fees paid → stage=issued (terminal)
  BEGIN
    UPDATE public.workflow_instances
       SET current_stage='issued', current_lane='fleet_ops',
           status='completed', completed_at=now(), updated_at=now(),
           data = data || jsonb_build_object(
             'amount_paid', 750,
             'new_expiry', (now() + interval '5 years')::date
           )
     WHERE id=v_inst_id;
    INSERT INTO public.workflow_transitions (
      organization_id, instance_id, workflow_type,
      from_stage, to_stage, from_lane, to_lane,
      decision, performed_by, performed_by_name, payload
    ) VALUES (
      v_org, v_inst_id, 'license_renewal',
      'pay_fees','issued','finance','fleet_ops',
      'paid', v_fleetops, 'E2E Finance',
      jsonb_build_object('amount_paid', 750)
    );
    t_step:='5_issued'; t_flow:='license'; t_status:='PASS';
    t_detail:='new license issued & archived'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    t_step:='5_issued'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;

  -- Step 6: verify final stage + history depth
  BEGIN
    SELECT current_stage INTO v_stage FROM public.workflow_instances WHERE id=v_inst_id;
    IF v_stage = 'issued' AND
       (SELECT count(*) FROM public.workflow_transitions WHERE instance_id=v_inst_id) >= 4 THEN
      t_step:='6_audit_trail'; t_flow:='license'; t_status:='PASS';
      t_detail:='final stage=issued, 4+ transitions logged'; RETURN NEXT;
    ELSE
      t_step:='6_audit_trail'; t_flow:='license'; t_status:='FAIL';
      t_detail:='final stage='||COALESCE(v_stage,'(null)'); RETURN NEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    t_step:='6_audit_trail'; t_flow:='license'; t_status:='FAIL';
    t_detail:=SQLERRM; RETURN NEXT;
  END;
END;
$function$;

-- Cleanup helper
CREATE OR REPLACE FUNCTION public.cleanup_license_renewal_e2e_test()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.workflow_transitions
   WHERE instance_id IN (
     SELECT id FROM public.workflow_instances
      WHERE workflow_type='license_renewal'
        AND reference_number LIKE 'LIC-E2E-%'
   );
  DELETE FROM public.workflow_instances
   WHERE workflow_type='license_renewal'
     AND reference_number LIKE 'LIC-E2E-%';
END;
$function$;

REVOKE ALL ON FUNCTION public.run_license_renewal_e2e_test() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_license_renewal_e2e_test() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_license_renewal_e2e_test() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_license_renewal_e2e_test() TO service_role;