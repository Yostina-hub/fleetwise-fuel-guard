CREATE OR REPLACE FUNCTION public.can_submit_vehicle_request_rating_for_requester(
  _vehicle_request_id uuid,
  _organization_id uuid,
  _requester_id uuid
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
      AND vr.requester_id = _requester_id
      AND (
        vr.status = ANY (ARRAY['completed'::text, 'closed'::text])
        OR vr.completed_at IS NOT NULL
        OR vr.driver_checked_out_at IS NOT NULL
        OR vr.requester_confirmed_at IS NOT NULL
      )
  )
$$;

DROP POLICY IF EXISTS "Requester can submit rating" ON public.vehicle_request_ratings;
CREATE POLICY "Requester or super admin can submit rating"
ON public.vehicle_request_ratings
FOR INSERT
WITH CHECK (
  (
    rated_by = auth.uid()
    AND public.can_submit_vehicle_request_rating_for_requester(
      vehicle_request_id,
      organization_id,
      auth.uid()
    )
  )
  OR (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND public.can_submit_vehicle_request_rating_for_requester(
      vehicle_request_id,
      organization_id,
      rated_by
    )
  )
);

DROP POLICY IF EXISTS "Org users can update vehicle_requests" ON public.vehicle_requests;
CREATE POLICY "Org users or super admins can update vehicle_requests"
ON public.vehicle_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);