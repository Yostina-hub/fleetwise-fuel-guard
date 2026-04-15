
-- ═══════════════════════════════════════════════════════════
-- 1. Immobilization Sequences
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.immobilization_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('unauthorized_movement', 'geofence_breach')),
  trigger_alert_id UUID REFERENCES public.alerts(id),
  geofence_id UUID REFERENCES public.geofences(id),
  sequence_status TEXT NOT NULL DEFAULT 'pending' CHECK (sequence_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
  speed_steps JSONB NOT NULL DEFAULT '[80, 60, 40, 20, 0]'::jsonb,
  current_step_index INT NOT NULL DEFAULT 0,
  step_interval_seconds INT NOT NULL DEFAULT 30,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.immobilization_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "immob_seq_select" ON public.immobilization_sequences FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "immob_seq_insert" ON public.immobilization_sequences FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "immob_seq_update" ON public.immobilization_sequences FOR UPDATE TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE TRIGGER update_immob_seq_updated_at BEFORE UPDATE ON public.immobilization_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_immob_seq_org ON public.immobilization_sequences(organization_id);
CREATE INDEX idx_immob_seq_vehicle ON public.immobilization_sequences(vehicle_id);
CREATE INDEX idx_immob_seq_status ON public.immobilization_sequences(sequence_status);

-- ═══════════════════════════════════════════════════════════
-- 2. Immobilization Steps
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.immobilization_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.immobilization_sequences(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  step_number INT NOT NULL,
  target_speed_kmh INT NOT NULL,
  device_command_id UUID REFERENCES public.device_commands(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

ALTER TABLE public.immobilization_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "immob_steps_select" ON public.immobilization_steps FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "immob_steps_insert" ON public.immobilization_steps FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "immob_steps_update" ON public.immobilization_steps FOR UPDATE TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE TRIGGER update_immob_steps_updated_at BEFORE UPDATE ON public.immobilization_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_immob_steps_seq ON public.immobilization_steps(sequence_id);

-- ═══════════════════════════════════════════════════════════
-- 3. Alert ↔ Dashcam Links
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.alert_dashcam_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  dashcam_event_id UUID NOT NULL REFERENCES public.dash_cam_events(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'manual' CHECK (link_type IN ('auto', 'manual')),
  linked_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alert_id, dashcam_event_id)
);

ALTER TABLE public.alert_dashcam_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_dashcam_select" ON public.alert_dashcam_links FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "alert_dashcam_insert" ON public.alert_dashcam_links FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "alert_dashcam_delete" ON public.alert_dashcam_links FOR DELETE TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE INDEX idx_alert_dashcam_alert ON public.alert_dashcam_links(alert_id);
CREATE INDEX idx_alert_dashcam_event ON public.alert_dashcam_links(dashcam_event_id);

-- ═══════════════════════════════════════════════════════════
-- 4. Auto-create alert from dashcam events (trigger)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_alert_from_dashcam()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  new_alert_id UUID;
  alert_severity TEXT;
  alert_title TEXT;
BEGIN
  -- Map dashcam severity to alert severity
  alert_severity := CASE
    WHEN NEW.severity = 'critical' THEN 'critical'
    WHEN NEW.severity = 'high' THEN 'warning'
    ELSE 'info'
  END;

  alert_title := 'Dashcam: ' || REPLACE(NEW.event_type, '_', ' ');

  INSERT INTO public.alerts (
    organization_id, vehicle_id, driver_id,
    alert_type, severity, title, message,
    alert_time, lat, lng, status,
    alert_data
  ) VALUES (
    NEW.organization_id, NEW.vehicle_id, NEW.driver_id,
    'dashcam_' || NEW.event_type, alert_severity, alert_title,
    'Automatic alert from dashcam event: ' || COALESCE(NEW.notes, NEW.event_type),
    NEW.event_time, NEW.lat, NEW.lng, 'unacknowledged',
    jsonb_build_object(
      'dashcam_event_id', NEW.id,
      'speed_kmh', NEW.speed_kmh,
      'video_url', NEW.video_url,
      'thumbnail_url', NEW.thumbnail_url,
      'ai_detected', NEW.ai_detected,
      'ai_confidence', NEW.ai_confidence
    )
  ) RETURNING id INTO new_alert_id;

  -- Auto-link the dashcam event to the alert
  INSERT INTO public.alert_dashcam_links (
    organization_id, alert_id, dashcam_event_id, link_type
  ) VALUES (
    NEW.organization_id, new_alert_id, NEW.id, 'auto'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_alert_from_dashcam
  AFTER INSERT ON public.dash_cam_events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_alert_from_dashcam();

-- ═══════════════════════════════════════════════════════════
-- 5. Enable realtime for immobilization sequences
-- ═══════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.immobilization_sequences;
