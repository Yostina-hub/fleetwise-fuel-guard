-- 1. Confirmation fields on vehicle_requests
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS requester_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS requester_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS requester_confirmation_notes text;

-- 2. Ratings table
CREATE TABLE IF NOT EXISTS public.vehicle_request_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_request_id uuid NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  rated_by uuid NOT NULL,                                   -- auth.users id of the requester
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_score smallint CHECK (driver_score BETWEEN 1 AND 5),
  vehicle_score smallint CHECK (vehicle_score BETWEEN 1 AND 5),
  punctuality_score smallint CHECK (punctuality_score BETWEEN 1 AND 5),
  overall_score smallint CHECK (overall_score BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR length(comment) <= 1000),
  dispute_flagged boolean NOT NULL DEFAULT false,
  dispute_reason text CHECK (dispute_reason IS NULL OR length(dispute_reason) <= 1000),
  dispute_resolved_at timestamptz,
  dispute_resolved_by uuid,
  dispute_resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_request_id)
);

CREATE INDEX IF NOT EXISTS idx_vrr_org ON public.vehicle_request_ratings(organization_id);
CREATE INDEX IF NOT EXISTS idx_vrr_driver ON public.vehicle_request_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_vrr_vehicle ON public.vehicle_request_ratings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vrr_dispute ON public.vehicle_request_ratings(dispute_flagged) WHERE dispute_flagged = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_vrr_updated_at ON public.vehicle_request_ratings;
CREATE TRIGGER trg_vrr_updated_at
BEFORE UPDATE ON public.vehicle_request_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS
ALTER TABLE public.vehicle_request_ratings ENABLE ROW LEVEL SECURITY;

-- Helper: ensure the user belongs to the same organization as the request
-- View: anyone in the same organization can read (drivers see their own scores via app filters)
CREATE POLICY "Org members can view ratings"
ON public.vehicle_request_ratings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Insert: only the requester of the underlying vehicle_request, after it's completed
CREATE POLICY "Requester can submit rating"
ON public.vehicle_request_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  rated_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_id
      AND vr.organization_id = vehicle_request_ratings.organization_id
      AND vr.requester_id = auth.uid()
      AND vr.status = 'completed'
  )
);

-- Update: requester can edit their own rating; admins/managers can resolve disputes
CREATE POLICY "Requester or admin can update rating"
ON public.vehicle_request_ratings
FOR UPDATE
TO authenticated
USING (
  rated_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
  OR public.has_role(auth.uid(), 'operations_manager'::app_role)
)
WITH CHECK (
  rated_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
  OR public.has_role(auth.uid(), 'operations_manager'::app_role)
);

-- Delete: admins only
CREATE POLICY "Admins can delete ratings"
ON public.vehicle_request_ratings
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);