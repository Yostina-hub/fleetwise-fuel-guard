-- Allow the original rater (the requester) to update their own rating row.
-- The current policy only lets fleet/ops managers and super admins update,
-- which breaks the upsert used by ConfirmAndRateDialog when a rating row
-- already exists (e.g. user re-opens the dialog and edits scores).

DROP POLICY IF EXISTS "Requester or admin can update rating" ON public.vehicle_request_ratings;

CREATE POLICY "Requester or admin can update rating"
ON public.vehicle_request_ratings
FOR UPDATE
TO authenticated
USING (
  rated_by = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'fleet_manager'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
)
WITH CHECK (
  -- Requester can update their own row, but only for the same trip and
  -- without changing who the rating belongs to. Managers/admins keep full edit
  -- access (used by the dispute resolution flow on the Trip Reviews page).
  (
    rated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.vehicle_requests vr
      WHERE vr.id = vehicle_request_ratings.vehicle_request_id
        AND vr.organization_id = vehicle_request_ratings.organization_id
        AND vr.requester_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'fleet_manager'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
);