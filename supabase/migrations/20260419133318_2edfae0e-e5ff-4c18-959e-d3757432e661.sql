
-- ============================================================================
-- 1) driver_notifications table — central inbox for the Driver Portal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.driver_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NULL,
  link TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_instance_id UUID NULL REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_unread
  ON public.driver_notifications (driver_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_org
  ON public.driver_notifications (organization_id, created_at DESC);

ALTER TABLE public.driver_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_read_own_notifications" ON public.driver_notifications;
CREATE POLICY "drivers_read_own_notifications"
  ON public.driver_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_notifications.driver_id
        AND d.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'fleet_manager')
    OR public.has_role(auth.uid(), 'operations_manager')
    OR public.has_role(auth.uid(), 'fleet_owner')
  );

DROP POLICY IF EXISTS "drivers_update_own_notifications" ON public.driver_notifications;
CREATE POLICY "drivers_update_own_notifications"
  ON public.driver_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_notifications.driver_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_insert_driver_notifications" ON public.driver_notifications;
CREATE POLICY "service_insert_driver_notifications"
  ON public.driver_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'driver_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_notifications';
  END IF;
END $$;

-- ============================================================================
-- 2) RLS: drivers can self-file workflow_instances for themselves
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_instances'
      AND policyname = 'drivers_insert_own_workflow_instances'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "drivers_insert_own_workflow_instances"
        ON public.workflow_instances
        FOR INSERT
        TO authenticated
        WITH CHECK (
          created_by = auth.uid()
          AND organization_id = public.get_user_organization(auth.uid())
          AND (
            driver_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.drivers d
              WHERE d.id = workflow_instances.driver_id
                AND d.organization_id = workflow_instances.organization_id
            )
          )
        )
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_instances'
      AND policyname = 'drivers_select_own_workflow_instances'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "drivers_select_own_workflow_instances"
        ON public.workflow_instances
        FOR SELECT
        TO authenticated
        USING (
          created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.drivers d
            WHERE d.id = workflow_instances.driver_id
              AND d.user_id = auth.uid()
          )
        )
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_transitions'
      AND policyname = 'drivers_select_own_workflow_transitions'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "drivers_select_own_workflow_transitions"
        ON public.workflow_transitions
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.workflow_instances wi
            WHERE wi.id = workflow_transitions.instance_id
              AND (
                wi.created_by = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.drivers d
                  WHERE d.id = wi.driver_id
                    AND d.user_id = auth.uid()
                )
              )
          )
        )
    $POL$;
  END IF;
END $$;

-- ============================================================================
-- 3) Generic notification trigger — workflow stage transitions for drivers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_driver_on_workflow_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_user_id UUID;
  v_workflow_label TEXT;
  v_kind TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.current_stage IS NOT DISTINCT FROM OLD.current_stage
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_driver_user_id
    FROM public.drivers
   WHERE id = NEW.driver_id;

  v_workflow_label := CASE NEW.workflow_type
    WHEN 'license_renewal'    THEN 'Driver License Renewal'
    WHEN 'driver_training'    THEN 'Driver Training'
    WHEN 'driver_allowance'   THEN 'Driver Allowance'
    WHEN 'driver_onboarding'  THEN 'Driver Onboarding'
    WHEN 'fuel_request'       THEN 'Fuel Request'
    WHEN 'vehicle_request'    THEN 'Vehicle Request'
    WHEN 'safety_comfort'     THEN 'Safety & Comfort'
    WHEN 'maintenance_request'THEN 'Maintenance Request'
    ELSE INITCAP(REPLACE(NEW.workflow_type, '_', ' '))
  END;

  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    v_kind  := 'workflow_completed';
    v_title := v_workflow_label || ' completed';
    v_body  := COALESCE(NEW.reference_number, 'Your request') || ' has been completed.';
  ELSE
    v_kind  := 'workflow_stage';
    v_title := v_workflow_label || ' update';
    v_body  := COALESCE(NEW.reference_number, 'Your request') || ' moved to stage: ' || NEW.current_stage;
  END IF;

  INSERT INTO public.driver_notifications
    (organization_id, driver_id, user_id, kind, title, body, link, payload, workflow_instance_id)
  VALUES
    (NEW.organization_id, NEW.driver_id, v_driver_user_id, v_kind, v_title, v_body,
     '/driver-portal?tab=requests',
     jsonb_build_object(
       'workflow_type', NEW.workflow_type,
       'workflow_instance_id', NEW.id,
       'reference_number', NEW.reference_number,
       'current_stage', NEW.current_stage,
       'status', NEW.status
     ),
     NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_driver_on_workflow_event ON public.workflow_instances;
CREATE TRIGGER trg_notify_driver_on_workflow_event
  AFTER INSERT OR UPDATE ON public.workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_workflow_event();

-- ============================================================================
-- 4) License-renewed trigger — when admin advances license_expiry
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_driver_on_license_renewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.license_expiry IS DISTINCT FROM OLD.license_expiry
     AND NEW.license_expiry IS NOT NULL
     AND (OLD.license_expiry IS NULL OR NEW.license_expiry > OLD.license_expiry) THEN
    INSERT INTO public.driver_notifications
      (organization_id, driver_id, user_id, kind, title, body, link, payload)
    VALUES
      (NEW.organization_id, NEW.id, NEW.user_id,
       'license_renewed',
       'Driver license renewed',
       'Your new license expiry is ' || to_char(NEW.license_expiry, 'YYYY-MM-DD') || '.',
       '/driver-portal?tab=compliance',
       jsonb_build_object(
         'license_number', NEW.license_number,
         'old_expiry', OLD.license_expiry,
         'new_expiry', NEW.license_expiry
       ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_driver_on_license_renewed ON public.drivers;
CREATE TRIGGER trg_notify_driver_on_license_renewed
  AFTER UPDATE OF license_expiry ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_license_renewed();
