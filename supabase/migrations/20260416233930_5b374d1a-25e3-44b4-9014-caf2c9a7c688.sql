CREATE OR REPLACE FUNCTION public.compute_predictive_scores(p_org_id uuid)
RETURNS TABLE(processed integer, critical integer, high integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v RECORD;
  v_score int;
  v_risk text;
  v_overdue int;
  v_age int;
  v_mileage numeric;
  v_recent_alerts int;
  v_component text;
  v_days int;
  v_action text;
  v_priority text;
  v_factors jsonb;
  v_processed int := 0;
  v_critical int := 0;
  v_high int := 0;
BEGIN
  FOR v IN
    SELECT id, year, odometer_km
    FROM public.vehicles
    WHERE organization_id = p_org_id AND status != 'retired'
  LOOP
    v_mileage := COALESCE(v.odometer_km, 0);
    v_age := CASE WHEN v.year IS NULL THEN 0 ELSE EXTRACT(YEAR FROM now())::int - v.year END;

    SELECT COUNT(*) INTO v_overdue
      FROM public.maintenance_schedules
      WHERE vehicle_id = v.id AND is_active = true
        AND next_due_date IS NOT NULL AND next_due_date < now();

    SELECT COUNT(*) INTO v_recent_alerts
      FROM public.alerts
      WHERE vehicle_id = v.id
        AND alert_time > now() - interval '30 days'
        AND severity IN ('high','critical');

    v_score := 100;
    IF v_mileage > 250000 THEN v_score := v_score - 25;
    ELSIF v_mileage > 150000 THEN v_score := v_score - 15;
    ELSIF v_mileage > 80000 THEN v_score := v_score - 8;
    END IF;

    IF v_age > 10 THEN v_score := v_score - 15;
    ELSIF v_age > 6 THEN v_score := v_score - 8;
    ELSIF v_age > 3 THEN v_score := v_score - 3;
    END IF;

    v_score := v_score - (v_overdue * 10);
    v_score := v_score - LEAST(v_recent_alerts * 4, 20);
    v_score := GREATEST(v_score, 5);

    v_risk := CASE
      WHEN v_score < 50 THEN 'critical'
      WHEN v_score < 70 THEN 'high'
      WHEN v_score < 85 THEN 'medium'
      ELSE 'low'
    END;

    IF v_mileage > 200000 OR v_age > 10 THEN
      v_component := 'Engine / Transmission'; v_days := 14;
    ELSIF v_overdue >= 2 THEN
      v_component := 'Brake System'; v_days := 21;
    ELSIF v_recent_alerts > 2 THEN
      v_component := 'Electrical / Sensors'; v_days := 30;
    ELSIF v_score < 85 THEN
      v_component := 'Battery / Belts'; v_days := 60;
    ELSE
      v_component := NULL; v_days := NULL;
    END IF;

    v_action := CASE v_risk
      WHEN 'critical' THEN 'Schedule immediate inspection and create urgent work order'
      WHEN 'high' THEN 'Schedule comprehensive inspection within 7 days'
      WHEN 'medium' THEN 'Plan preventive service within 30 days'
      ELSE 'Continue routine monitoring'
    END;

    v_priority := CASE v_risk
      WHEN 'critical' THEN 'urgent'
      WHEN 'high' THEN 'high'
      WHEN 'medium' THEN 'medium'
      ELSE 'low'
    END;

    v_factors := jsonb_build_object(
      'mileage_km', v_mileage,
      'vehicle_age_years', v_age,
      'overdue_schedules', v_overdue,
      'recent_high_alerts_30d', v_recent_alerts
    );

    INSERT INTO public.predictive_maintenance_scores
      (organization_id, vehicle_id, health_score, risk_level,
       predicted_failure_component, predicted_failure_window_days,
       contributing_factors, recommended_action, recommended_priority,
       status, computed_at)
    VALUES (p_org_id, v.id, v_score, v_risk, v_component, v_days,
            v_factors, v_action, v_priority, 'open', now())
    ON CONFLICT (organization_id, vehicle_id) DO UPDATE
      SET health_score = EXCLUDED.health_score,
          risk_level = EXCLUDED.risk_level,
          predicted_failure_component = EXCLUDED.predicted_failure_component,
          predicted_failure_window_days = EXCLUDED.predicted_failure_window_days,
          contributing_factors = EXCLUDED.contributing_factors,
          recommended_action = EXCLUDED.recommended_action,
          recommended_priority = EXCLUDED.recommended_priority,
          computed_at = now(),
          status = CASE
            WHEN public.predictive_maintenance_scores.status = 'dismissed' AND EXCLUDED.risk_level = 'critical' THEN 'open'
            ELSE public.predictive_maintenance_scores.status
          END,
          updated_at = now();

    v_processed := v_processed + 1;
    IF v_risk = 'critical' THEN v_critical := v_critical + 1; END IF;
    IF v_risk = 'high' THEN v_high := v_high + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_critical, v_high;
END;
$function$;