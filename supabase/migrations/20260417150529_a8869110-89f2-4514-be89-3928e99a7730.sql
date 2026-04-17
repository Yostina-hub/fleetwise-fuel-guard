ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS webhook_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS event_trigger text,
  ADD COLUMN IF NOT EXISTS event_filter jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workflows_event_trigger
  ON public.workflows (organization_id, event_trigger)
  WHERE status = 'active' AND event_trigger IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_cron_active
  ON public.workflows (status, cron_expression)
  WHERE status = 'active' AND cron_expression IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_started
  ON public.workflow_runs (workflow_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.assign_workflow_webhook_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trigger_type = 'webhook' AND NEW.webhook_token IS NULL THEN
    NEW.webhook_token := encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_workflow_webhook_token ON public.workflows;
CREATE TRIGGER trg_assign_workflow_webhook_token
  BEFORE INSERT OR UPDATE OF trigger_type ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.assign_workflow_webhook_token();

CREATE OR REPLACE FUNCTION public.notify_workflow_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_org uuid;
BEGIN
  v_event := CASE TG_TABLE_NAME
    WHEN 'alerts' THEN 'alert_created'
    WHEN 'geofence_events' THEN 'geofence_event'
    WHEN 'work_orders' THEN 'work_order_created'
    ELSE NULL
  END;

  IF v_event IS NULL THEN RETURN NEW; END IF;
  v_org := NEW.organization_id;

  INSERT INTO public.workflow_runs (workflow_id, organization_id, status, trigger_data)
  SELECT w.id, v_org, 'running',
         jsonb_build_object('event', v_event, 'source_table', TG_TABLE_NAME, 'row_id', NEW.id, 'queued_at', now())
  FROM public.workflows w
  WHERE w.organization_id = v_org
    AND w.status = 'active'
    AND w.event_trigger = v_event;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_event_alerts ON public.alerts;
CREATE TRIGGER trg_workflow_event_alerts
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_workflow_event();

DROP TRIGGER IF EXISTS trg_workflow_event_geofence ON public.geofence_events;
CREATE TRIGGER trg_workflow_event_geofence
  AFTER INSERT ON public.geofence_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_workflow_event();

DROP TRIGGER IF EXISTS trg_workflow_event_workorders ON public.work_orders;
CREATE TRIGGER trg_workflow_event_workorders
  AFTER INSERT ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_workflow_event();