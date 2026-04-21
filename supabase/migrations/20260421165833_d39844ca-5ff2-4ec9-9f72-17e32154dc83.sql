CREATE TABLE IF NOT EXISTS public.driver_coaching_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  source_alert_id UUID UNIQUE REFERENCES public.alerts(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'idle_time',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  recommendation TEXT,
  reroute_suggestion TEXT,
  suggested_assignment_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  coached_by UUID,
  coached_at TIMESTAMPTZ,
  coaching_notes TEXT,
  dismissed_by UUID,
  dismissed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcq_org_status ON public.driver_coaching_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_dcq_driver ON public.driver_coaching_queue(driver_id);
CREATE INDEX IF NOT EXISTS idx_dcq_vehicle ON public.driver_coaching_queue(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_dcq_assignment ON public.driver_coaching_queue(suggested_assignment_id);

ALTER TABLE public.driver_coaching_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view coaching queue" ON public.driver_coaching_queue;
CREATE POLICY "Org members can view coaching queue" ON public.driver_coaching_queue
FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Org members can insert coaching queue" ON public.driver_coaching_queue;
CREATE POLICY "Org members can insert coaching queue" ON public.driver_coaching_queue
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Org members can update coaching queue" ON public.driver_coaching_queue;
CREATE POLICY "Org members can update coaching queue" ON public.driver_coaching_queue
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Org admins can delete coaching queue" ON public.driver_coaching_queue;
CREATE POLICY "Org admins can delete coaching queue" ON public.driver_coaching_queue
FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND (public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'fleet_manager'))
);

DROP TRIGGER IF EXISTS trg_dcq_updated_at ON public.driver_coaching_queue;
CREATE TRIGGER trg_dcq_updated_at
BEFORE UPDATE ON public.driver_coaching_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enqueue_idle_coaching_from_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver UUID;
  v_assignment UUID;
  v_duration INT;
  v_suggestion TEXT;
BEGIN
  IF NEW.alert_type <> 'idle_time' THEN RETURN NEW; END IF;

  v_assignment := NULLIF(NEW.alert_data->>'suggested_next_assignment','')::UUID;
  v_duration := COALESCE((NEW.alert_data->>'duration_minutes')::INT, 0);

  IF v_assignment IS NOT NULL THEN
    SELECT driver_id INTO v_driver FROM public.trip_assignments WHERE id = v_assignment LIMIT 1;
  END IF;
  IF v_driver IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT driver_id INTO v_driver
    FROM public.trip_assignments
    WHERE vehicle_id = NEW.vehicle_id AND status IN ('assigned','in_progress','pending')
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_suggestion := CASE
    WHEN v_assignment IS NOT NULL
      THEN 'Re-route assignment ' || substr(v_assignment::text,1,8) || ' to reduce idle exposure on next dispatch.'
    ELSE 'Flag for next assignment planning — no active dispatch found.'
  END;

  INSERT INTO public.driver_coaching_queue (
    organization_id, driver_id, vehicle_id, source_alert_id,
    source_type, severity, title, recommendation, reroute_suggestion,
    suggested_assignment_id, metadata
  ) VALUES (
    NEW.organization_id, v_driver, NEW.vehicle_id, NEW.id,
    'idle_time', NEW.severity,
    'Idle coaching: ' || v_duration || ' min',
    'Coach driver on engine-off discipline during stops ≥' || COALESCE((NEW.alert_data->>'threshold_minutes')::TEXT, '10') || ' min.',
    v_suggestion, v_assignment,
    jsonb_build_object('duration_minutes', v_duration, 'origin', 'idle-time-detector')
  )
  ON CONFLICT (source_alert_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_idle_coaching ON public.alerts;
CREATE TRIGGER trg_enqueue_idle_coaching
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.enqueue_idle_coaching_from_alert();

INSERT INTO public.driver_coaching_queue (
  organization_id, driver_id, vehicle_id, source_alert_id,
  source_type, severity, title, recommendation, reroute_suggestion,
  suggested_assignment_id, metadata
)
SELECT
  a.organization_id,
  (SELECT ta.driver_id FROM public.trip_assignments ta
     WHERE ta.vehicle_id = a.vehicle_id AND ta.status IN ('assigned','in_progress','pending')
     ORDER BY ta.created_at DESC LIMIT 1) AS driver_id,
  a.vehicle_id,
  a.id,
  'idle_time',
  a.severity,
  'Idle coaching: ' || COALESCE((a.alert_data->>'duration_minutes')::TEXT,'?') || ' min',
  'Coach driver on engine-off discipline during stops ≥' || COALESCE((a.alert_data->>'threshold_minutes')::TEXT, '10') || ' min.',
  CASE WHEN NULLIF(a.alert_data->>'suggested_next_assignment','') IS NOT NULL
    THEN 'Re-route assignment ' || substr(a.alert_data->>'suggested_next_assignment',1,8) || ' to reduce idle exposure on next dispatch.'
    ELSE 'Flag for next assignment planning — no active dispatch found.'
  END,
  NULLIF(a.alert_data->>'suggested_next_assignment','')::UUID,
  jsonb_build_object('duration_minutes', COALESCE((a.alert_data->>'duration_minutes')::INT,0), 'origin', 'backfill')
FROM public.alerts a
WHERE a.alert_type = 'idle_time' AND a.status = 'open'
ON CONFLICT (source_alert_id) DO NOTHING;