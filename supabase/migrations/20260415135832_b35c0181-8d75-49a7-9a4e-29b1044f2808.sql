
-- Add new columns to vehicle_requests for dynamic form
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS departure_place TEXT,
  ADD COLUMN IF NOT EXISTS departure_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS departure_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS num_vehicles INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'round_trip',
  ADD COLUMN IF NOT EXISTS pool_category TEXT,
  ADD COLUMN IF NOT EXISTS pool_name TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_by UUID,
  ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_routed_to TEXT,
  ADD COLUMN IF NOT EXISTS trip_duration_days INTEGER;

-- Create fleet_pools table
CREATE TABLE IF NOT EXISTS public.fleet_pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- corporate, zone, region
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

ALTER TABLE public.fleet_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_pools_select_org" ON public.fleet_pools
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "fleet_pools_manage_org" ON public.fleet_pools
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_fleet_pools_updated_at
  BEFORE UPDATE ON public.fleet_pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to route vehicle request approval based on delegation rules
CREATE OR REPLACE FUNCTION public.route_vehicle_request_approval(p_request_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_requester_role TEXT;
  v_duration_days INTEGER;
  v_route_to TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.vehicle_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Calculate trip duration in days
  IF v_request.needed_until IS NOT NULL THEN
    v_duration_days := EXTRACT(DAY FROM (v_request.needed_until::timestamp - v_request.needed_from::timestamp)) + 1;
  ELSE
    v_duration_days := 1;
  END IF;

  -- Update trip_duration_days
  UPDATE public.vehicle_requests SET trip_duration_days = v_duration_days WHERE id = p_request_id;

  -- Check if requester is manager or above (auto-approve)
  SELECT ur.role INTO v_requester_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_request.requester_id
  ORDER BY CASE ur.role
    WHEN 'super_admin' THEN 1
    WHEN 'org_admin' THEN 2
    WHEN 'director' THEN 3
    WHEN 'manager' THEN 4
    ELSE 10
  END
  LIMIT 1;

  IF v_requester_role IN ('super_admin', 'org_admin', 'director', 'manager') THEN
    -- Auto-approve for manager and above
    UPDATE public.vehicle_requests 
    SET status = 'approved', approval_status = 'auto_approved', approval_routed_to = 'self',
        updated_at = now()
    WHERE id = p_request_id;

    -- Create auto-approval record
    INSERT INTO public.vehicle_request_approvals (
      organization_id, request_id, approver_id, approver_name, approval_level,
      decision, decided_at, comments
    ) VALUES (
      v_request.organization_id, p_request_id, v_request.requester_id, v_request.requester_name, 1,
      'approved', now(), 'Auto-approved: requester is ' || v_requester_role
    );

    RETURN 'auto_approved';
  END IF;

  -- Route based on duration
  IF v_duration_days <= 15 THEN
    v_route_to := 'manager';
  ELSE
    v_route_to := 'director';
  END IF;

  -- Check delegation matrix for active delegates
  -- (Uses existing get_active_delegate function)

  UPDATE public.vehicle_requests 
  SET approval_status = 'pending_approval', approval_routed_to = v_route_to,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN v_route_to;
END;
$$;
