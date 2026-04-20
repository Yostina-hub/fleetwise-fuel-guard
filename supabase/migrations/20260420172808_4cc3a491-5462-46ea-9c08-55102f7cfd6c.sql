-- ============================================================================
-- Requester Portal — RLS isolation + comments thread
-- ============================================================================
-- 1) Helper: is the caller in role 'user' AND not in any other workspace role?
CREATE OR REPLACE FUNCTION public.is_basic_user_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'user'::app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role <> 'user'::app_role
      AND role <> 'viewer'::app_role
  );
$$;

-- 2) Replace the SELECT policy on vehicle_requests so basic 'user' role only sees their own.
DROP POLICY IF EXISTS "Vehicle requests: drivers see own; org sees all" ON public.vehicle_requests;

CREATE POLICY "Vehicle requests: scoped visibility"
ON public.vehicle_requests
FOR SELECT
USING (
  CASE
    -- super_admin: full visibility
    WHEN public.is_super_admin(auth.uid()) THEN true
    -- driver-only: own assignments + own requests
    WHEN public.is_driver_only(auth.uid())
      THEN (assigned_driver_id = public.current_driver_id() OR requester_id = auth.uid())
    -- basic 'user' role only: only own requests (requester portal isolation)
    WHEN public.is_basic_user_only(auth.uid())
      THEN requester_id = auth.uid()
    -- everyone else: org-wide visibility
    ELSE organization_id IN (
      SELECT profiles.organization_id FROM public.profiles WHERE profiles.id = auth.uid()
    )
  END
);

-- 3) Comments thread for vehicle requests (used by Requester Portal & approvers).
CREATE TABLE IF NOT EXISTS public.vehicle_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text,
  author_role text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_request_comments_request_idx
  ON public.vehicle_request_comments(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_request_comments_org_idx
  ON public.vehicle_request_comments(organization_id);

ALTER TABLE public.vehicle_request_comments ENABLE ROW LEVEL SECURITY;

-- SELECT — same scoping rules as the parent request
CREATE POLICY "vrc_select_scoped"
ON public.vehicle_request_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_comments.request_id
      -- inherit visibility via the parent row's policy
  )
  AND (
    -- non-internal: anyone who can see the parent request can read
    NOT is_internal
    OR
    -- internal: hide from basic 'user' role
    NOT public.is_basic_user_only(auth.uid())
  )
);

-- INSERT — must belong to the same org as the request, and author_id must match auth.uid()
CREATE POLICY "vrc_insert_org_member"
ON public.vehicle_request_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND organization_id IN (
    SELECT profiles.organization_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_comments.request_id
      AND vr.organization_id = vehicle_request_comments.organization_id
  )
  -- basic 'user' role can only comment on their OWN requests, and never internal
  AND (
    NOT public.is_basic_user_only(auth.uid())
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.vehicle_requests vr
        WHERE vr.id = vehicle_request_comments.request_id AND vr.requester_id = auth.uid()
      )
    )
  )
);

-- UPDATE — author can edit their own within 15 minutes
CREATE POLICY "vrc_update_own"
ON public.vehicle_request_comments
FOR UPDATE
USING (author_id = auth.uid() AND created_at > now() - interval '15 minutes')
WITH CHECK (author_id = auth.uid());

-- DELETE — author or org_admin
CREATE POLICY "vrc_delete_own_or_admin"
ON public.vehicle_request_comments
FOR DELETE
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'org_admin'::app_role)
  OR public.is_super_admin(auth.uid())
);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_vehicle_request_comments_updated_at ON public.vehicle_request_comments;
CREATE TRIGGER update_vehicle_request_comments_updated_at
BEFORE UPDATE ON public.vehicle_request_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_request_comments;