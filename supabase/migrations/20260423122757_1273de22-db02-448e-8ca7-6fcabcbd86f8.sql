
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_reason text,
  ADD COLUMN IF NOT EXISTS active_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_path text;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON public.user_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_org_started ON public.user_sessions(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;

DROP POLICY IF EXISTS "Admins can view org sessions" ON public.user_sessions;
CREATE POLICY "Admins can view org sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role))
  );

DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_category text,
  resource_type text,
  resource_id uuid,
  path text,
  duration_ms integer,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uae_user_time ON public.user_activity_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_uae_org_time ON public.user_activity_events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_uae_type ON public.user_activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_uae_resource ON public.user_activity_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_uae_session ON public.user_activity_events(session_id);

ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own activity events" ON public.user_activity_events;
CREATE POLICY "Users can insert own activity events"
  ON public.user_activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own activity events" ON public.user_activity_events;
CREATE POLICY "Users can view own activity events"
  ON public.user_activity_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view org activity events" ON public.user_activity_events;
CREATE POLICY "Admins can view org activity events"
  ON public.user_activity_events
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role))
  );

CREATE OR REPLACE VIEW public.user_activity_summary
WITH (security_invoker = true)
AS
SELECT
  s.user_id,
  s.organization_id,
  COUNT(*) FILTER (WHERE s.started_at >= now() - interval '30 days') AS sessions_30d,
  COALESCE(SUM(s.active_seconds) FILTER (WHERE s.started_at >= now() - interval '30 days'), 0) AS active_seconds_30d,
  COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_active_at) - s.started_at)))
              FILTER (WHERE s.started_at >= now() - interval '30 days'), 0)::bigint AS total_seconds_30d,
  MAX(s.last_active_at) AS last_active_at,
  MAX(s.started_at) AS last_session_at
FROM public.user_sessions s
GROUP BY s.user_id, s.organization_id;

GRANT SELECT ON public.user_activity_summary TO authenticated;
