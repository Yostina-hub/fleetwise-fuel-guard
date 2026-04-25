-- ===========================================================================
-- Urgent Incident SLA — 10-minute response deadline + auto-escalation
-- ===========================================================================
-- Adds SLA tracking columns to incidents (severity='critical') and
-- incident_tickets (priority='urgent'). A trigger sets sla_deadline_at
-- to created_at + 10min when the row qualifies. The incident-sla-monitor
-- edge function (separate) flips sla_breached_at and sla_breach_notified
-- after the deadline passes.
-- ===========================================================================

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS sla_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breach_notified boolean NOT NULL DEFAULT false;

ALTER TABLE public.incident_tickets
  ADD COLUMN IF NOT EXISTS sla_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breach_notified boolean NOT NULL DEFAULT false;

-- Index for fast scanning by the SLA monitor
CREATE INDEX IF NOT EXISTS idx_incidents_sla_deadline
  ON public.incidents (sla_deadline_at)
  WHERE sla_deadline_at IS NOT NULL AND sla_breached_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_incident_tickets_sla_deadline
  ON public.incident_tickets (sla_deadline_at)
  WHERE sla_deadline_at IS NOT NULL AND sla_breached_at IS NULL;

-- Trigger function: set SLA deadline for critical incidents
CREATE OR REPLACE FUNCTION public.set_incident_sla_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.severity = 'critical' AND NEW.sla_deadline_at IS NULL THEN
    NEW.sla_deadline_at := COALESCE(NEW.created_at, now()) + interval '10 minutes';
  END IF;
  -- Allow recompute if severity changes to/from critical
  IF TG_OP = 'UPDATE'
     AND NEW.severity = 'critical'
     AND (OLD.severity IS DISTINCT FROM 'critical')
     AND NEW.sla_deadline_at IS NULL THEN
    NEW.sla_deadline_at := now() + interval '10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incidents_sla_deadline ON public.incidents;
CREATE TRIGGER trg_incidents_sla_deadline
  BEFORE INSERT OR UPDATE OF severity ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_incident_sla_deadline();

-- Trigger function: set SLA deadline for urgent tickets
CREATE OR REPLACE FUNCTION public.set_incident_ticket_sla_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.priority = 'urgent' AND NEW.sla_deadline_at IS NULL THEN
    NEW.sla_deadline_at := COALESCE(NEW.created_at, now()) + interval '10 minutes';
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.priority = 'urgent'
     AND (OLD.priority IS DISTINCT FROM 'urgent')
     AND NEW.sla_deadline_at IS NULL THEN
    NEW.sla_deadline_at := now() + interval '10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_tickets_sla_deadline ON public.incident_tickets;
CREATE TRIGGER trg_incident_tickets_sla_deadline
  BEFORE INSERT OR UPDATE OF priority ON public.incident_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_incident_ticket_sla_deadline();

-- Backfill existing rows (one-time)
UPDATE public.incidents
SET sla_deadline_at = created_at + interval '10 minutes'
WHERE severity = 'critical' AND sla_deadline_at IS NULL;

UPDATE public.incident_tickets
SET sla_deadline_at = created_at + interval '10 minutes'
WHERE priority = 'urgent' AND sla_deadline_at IS NULL;