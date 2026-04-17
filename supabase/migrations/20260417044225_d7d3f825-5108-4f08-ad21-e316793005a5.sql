-- Helper: drivers.id for current auth user
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper: is this user "driver-only" (driver role and no elevated role)
CREATE OR REPLACE FUNCTION public.is_driver_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'driver')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN (
          'super_admin','org_admin','operations_manager','fleet_owner',
          'fleet_manager','dispatcher','operator','auditor','technician',
          'maintenance_lead','mechanic','fuel_controller'
        )
    )
    AND NOT public.is_super_admin(_user_id)
$$;

-- TRIPS
DROP POLICY IF EXISTS "Drivers can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips in their organization" ON public.trips;
CREATE POLICY "Trips: drivers see only their own"
ON public.trips
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid())
      THEN driver_id = public.current_driver_id()
    ELSE
      organization_id = public.get_user_organization(auth.uid())
      OR public.is_super_admin(auth.uid())
  END
);

-- DISPATCH_JOBS
DROP POLICY IF EXISTS "Drivers can view own dispatch jobs" ON public.dispatch_jobs;
DROP POLICY IF EXISTS "Operational roles can view dispatch jobs" ON public.dispatch_jobs;
DROP POLICY IF EXISTS "Users can view dispatch jobs in their organization" ON public.dispatch_jobs;
CREATE POLICY "Dispatch jobs: drivers see only their own"
ON public.dispatch_jobs
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid())
      THEN driver_id = public.current_driver_id()
    ELSE
      organization_id = public.get_user_organization(auth.uid())
      OR public.is_super_admin(auth.uid())
  END
);

-- VEHICLE_REQUESTS
DROP POLICY IF EXISTS "Org users can view vehicle_requests" ON public.vehicle_requests;
CREATE POLICY "Vehicle requests: drivers see own; org sees all"
ON public.vehicle_requests
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid())
      THEN assigned_driver_id = public.current_driver_id()
        OR requester_id = auth.uid()
    ELSE
      organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      OR public.is_super_admin(auth.uid())
  END
);

-- MAINTENANCE_REQUESTS
DROP POLICY IF EXISTS "maintenance_requests_select" ON public.maintenance_requests;
CREATE POLICY "Maintenance requests: drivers see own; org sees all"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid())
      THEN driver_id = public.current_driver_id()
        OR requested_by = auth.uid()
    ELSE
      organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      OR public.is_super_admin(auth.uid())
  END
);

-- FUEL_REQUESTS
DROP POLICY IF EXISTS "fuel_requests_select" ON public.fuel_requests;
CREATE POLICY "Fuel requests: drivers see own; org sees all"
ON public.fuel_requests
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid())
      THEN driver_id = public.current_driver_id()
        OR requested_by = auth.uid()
    ELSE
      organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      OR public.is_super_admin(auth.uid())
  END
);
