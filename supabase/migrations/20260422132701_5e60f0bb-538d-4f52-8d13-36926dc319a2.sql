DROP POLICY IF EXISTS "Requester can submit rating" ON public.vehicle_request_ratings;

CREATE POLICY "Requester can submit rating"
ON public.vehicle_request_ratings
FOR INSERT
WITH CHECK (
  rated_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_ratings.vehicle_request_id
      AND vr.organization_id = vehicle_request_ratings.organization_id
      AND vr.requester_id = auth.uid()
      AND (
        vr.status IN ('completed', 'closed')
        OR vr.driver_checked_out_at IS NOT NULL
        OR vr.requester_confirmed_at IS NOT NULL
      )
  )
);