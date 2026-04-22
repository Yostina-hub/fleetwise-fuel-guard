CREATE OR REPLACE FUNCTION public.can_submit_vehicle_request_rating(
  _vehicle_request_id uuid,
  _organization_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_requests vr
    WHERE vr.id = _vehicle_request_id
      AND vr.organization_id = _organization_id
      AND vr.requester_id = _user_id
      AND (
        vr.status = ANY (ARRAY['completed'::text, 'closed'::text])
        OR vr.completed_at IS NOT NULL
        OR vr.driver_checked_out_at IS NOT NULL
        OR vr.requester_confirmed_at IS NOT NULL
      )
  )
$$;

DROP POLICY IF EXISTS "Requester can submit rating" ON public.vehicle_request_ratings;

CREATE POLICY "Requester can submit rating"
ON public.vehicle_request_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  rated_by = auth.uid()
  AND public.can_submit_vehicle_request_rating(
    vehicle_request_id,
    organization_id,
    auth.uid()
  )
);