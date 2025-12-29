-- Fix Work Orders INSERT/UPDATE permissions under RLS
-- The existing ALL policy uses USING but no WITH CHECK, which can block INSERTs.

DROP POLICY IF EXISTS "Maintenance leads can manage work orders" ON public.work_orders;

CREATE POLICY "Maintenance roles can insert work orders"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id = get_user_organization(auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_lead'::app_role)
    OR has_role(auth.uid(), 'operations_manager'::app_role)
  )
);

CREATE POLICY "Maintenance roles can update work orders"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  (organization_id = get_user_organization(auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_lead'::app_role)
    OR has_role(auth.uid(), 'operations_manager'::app_role)
  )
)
WITH CHECK (
  (organization_id = get_user_organization(auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_lead'::app_role)
    OR has_role(auth.uid(), 'operations_manager'::app_role)
  )
);

CREATE POLICY "Maintenance roles can delete work orders"
ON public.work_orders
FOR DELETE
TO authenticated
USING (
  (organization_id = get_user_organization(auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_lead'::app_role)
    OR has_role(auth.uid(), 'operations_manager'::app_role)
  )
);
