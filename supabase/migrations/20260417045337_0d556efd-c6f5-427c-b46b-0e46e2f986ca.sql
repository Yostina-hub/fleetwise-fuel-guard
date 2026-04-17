-- Tighten RLS for alerts and incidents so driver-only users only see records relevant to them.
-- Relies on existing helpers: public.is_driver_only(uuid), public.current_driver_id(),
-- public.get_user_organization(uuid), public.is_super_admin(uuid).

-- ============ ALERTS ============
DROP POLICY IF EXISTS "Users can view alerts in their organization" ON public.alerts;

CREATE POLICY "Alerts: drivers see own; org sees all"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid()) THEN (
      driver_id = public.current_driver_id()
      OR vehicle_id IN (
        SELECT t.vehicle_id FROM public.trips t
        WHERE t.driver_id = public.current_driver_id()
      )
    )
    ELSE (
      organization_id = public.get_user_organization(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  END
);

-- ============ INCIDENTS ============
-- Replace overlapping SELECT policies with a single, role-aware one.
DROP POLICY IF EXISTS "Drivers can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Operational roles can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can view incidents in their organization" ON public.incidents;

CREATE POLICY "Incidents: drivers see own; operational roles see org"
ON public.incidents
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.is_driver_only(auth.uid()) THEN (
      driver_id = public.current_driver_id()
    )
    ELSE (
      organization_id = public.get_user_organization(auth.uid())
      AND (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_role(auth.uid(), 'org_admin'::app_role)
        OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
        OR public.has_role(auth.uid(), 'operations_manager'::app_role)
        OR public.has_role(auth.uid(), 'operator'::app_role)
        OR public.has_role(auth.uid(), 'auditor'::app_role)
      )
    )
  END
);
