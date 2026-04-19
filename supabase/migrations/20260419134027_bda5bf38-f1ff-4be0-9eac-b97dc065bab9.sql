-- =============================================================================
-- Phase G — Close the license_renewal loop + multi-channel fan-out
-- =============================================================================

-- 1) Auto-apply renewed license details to drivers when the workflow completes.
--    Reads from the workflow_instance's data jsonb (new_expiry, new_license_number,
--    license_number) and updates the linked driver. The existing
--    notify_driver_on_license_renewed trigger then fires automatically.
CREATE OR REPLACE FUNCTION public.apply_license_renewal_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_expiry date;
  v_new_number text;
BEGIN
  -- Only act on license_renewal workflows that just transitioned to completed.
  IF NEW.workflow_type IS DISTINCT FROM 'license_renewal' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' THEN
    RETURN NEW;  -- already handled
  END IF;
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pull renewal details from the merged workflow data jsonb.
  v_new_expiry := NULLIF(NEW.data->>'new_expiry', '')::date;
  v_new_number := NULLIF(
    COALESCE(NEW.data->>'new_license_number', NEW.data->>'license_number'),
    ''
  );

  IF v_new_expiry IS NULL AND v_new_number IS NULL THEN
    RETURN NEW;  -- nothing to apply
  END IF;

  UPDATE public.drivers
  SET
    license_expiry = COALESCE(v_new_expiry, license_expiry),
    license_number = COALESCE(v_new_number, license_number),
    updated_at     = now()
  WHERE id = NEW.driver_id
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_license_renewal_on_complete ON public.workflow_instances;
CREATE TRIGGER trg_apply_license_renewal_on_complete
  AFTER UPDATE OF status ON public.workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_license_renewal_on_complete();

-- 2) Refine the workflow-stage notifier so it doesn't spam:
--    skip the very-first transition and the implicit "request" stage.
CREATE OR REPLACE FUNCTION public.notify_driver_on_workflow_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_title text;
  v_body text;
  v_link text;
  v_driver record;
BEGIN
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve the linked driver's user_id once.
  SELECT id, user_id, organization_id
    INTO v_driver
    FROM public.drivers
   WHERE id = NEW.driver_id
     AND organization_id = NEW.organization_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Skip the very first stage notification on initial filing.
    RETURN NEW;
  END IF;

  -- Only act on stage or status changes.
  IF NEW.current_stage IS NOT DISTINCT FROM OLD.current_stage
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    v_kind  := 'workflow_completed';
    v_title := COALESCE(NEW.title, NEW.reference_number) || ' — completed';
    v_body  := 'Your request has been completed.';
  ELSIF NEW.status IN ('cancelled','rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_kind  := 'workflow_' || NEW.status;
    v_title := COALESCE(NEW.title, NEW.reference_number) || ' — ' || NEW.status;
    v_body  := 'Your request was ' || NEW.status || '.';
  ELSIF NEW.current_stage IS DISTINCT FROM OLD.current_stage
        AND NEW.current_stage NOT IN ('request') THEN
    v_kind  := 'workflow_stage';
    v_title := COALESCE(NEW.title, NEW.reference_number) || ' — stage updated';
    v_body  := 'Stage: ' || NEW.current_stage;
  ELSE
    RETURN NEW;
  END IF;

  v_link := '/sop/' || replace(NEW.workflow_type, '_', '-');

  INSERT INTO public.driver_notifications
    (organization_id, driver_id, user_id, kind, title, body, link, payload, workflow_instance_id)
  VALUES
    (NEW.organization_id, v_driver.id, v_driver.user_id,
     v_kind, v_title, v_body, v_link,
     jsonb_build_object(
       'workflow_type', NEW.workflow_type,
       'reference_number', NEW.reference_number,
       'current_stage', NEW.current_stage,
       'status', NEW.status
     ),
     NEW.id);

  RETURN NEW;
END;
$$;

-- 3) Multi-channel fan-out: when a driver_notification is inserted, call the
--    notify-driver-event edge function in the background via pg_net.
--    Fan-out failures must NEVER block in-app delivery, so the trigger swallows
--    pg_net errors (e.g. extension not yet loaded in dev environments).
CREATE OR REPLACE FUNCTION public.fanout_driver_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_anon text;
BEGIN
  -- Best-effort: project URL + anon key are stored in app settings if present.
  -- Falls back gracefully when not configured (e.g. self-hosted dev).
  BEGIN
    v_url  := current_setting('app.settings.supabase_url', true);
    v_anon := current_setting('app.settings.supabase_anon_key', true);
  EXCEPTION WHEN others THEN
    v_url  := NULL;
    v_anon := NULL;
  END;

  IF v_url IS NULL OR v_anon IS NULL THEN
    -- Hard-coded project endpoint (kkmjwmyqakprqdhrlsoz) — anon key is publishable.
    v_url  := 'https://kkmjwmyqakprqdhrlsoz.supabase.co';
    v_anon := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWp3bXlxYWtwcnFkaHJsc296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTc5NDIsImV4cCI6MjA3NjczMzk0Mn0.hcyw7MEssoLz3e09IrJ-aZyepzMsDY98KLnXfjzvuF4';
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/notify-driver-event',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon
      ),
      body    := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN others THEN
    -- Don't block in-app delivery if pg_net is unavailable.
    RAISE NOTICE 'fanout_driver_notification skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fanout_driver_notification ON public.driver_notifications;
CREATE TRIGGER trg_fanout_driver_notification
  AFTER INSERT ON public.driver_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fanout_driver_notification();