
-- Fix fuel_theft_cases: allow all org members to view
CREATE POLICY "All org members can view fuel theft cases"
ON public.fuel_theft_cases FOR SELECT TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_transactions: allow all org members to insert
CREATE POLICY "All org members can insert fuel transactions"
ON public.fuel_transactions FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_transactions: allow all org members to update
CREATE POLICY "All org members can update fuel transactions"
ON public.fuel_transactions FOR UPDATE TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_depots: allow all org members to insert/update/delete
CREATE POLICY "All org members can manage fuel depots"
ON public.fuel_depots FOR ALL TO authenticated
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_depot_dispensing: allow all org members to insert
CREATE POLICY "All org members can insert dispensing"
ON public.fuel_depot_dispensing FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_depot_receiving: allow all org members to insert
CREATE POLICY "All org members can insert receiving"
ON public.fuel_depot_receiving FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization(auth.uid()));

-- Fix fuel_theft_cases: allow org members to update (for investigations)
CREATE POLICY "All org members can update fuel theft cases"
ON public.fuel_theft_cases FOR UPDATE TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Fix driver_fuel_cards: ensure all org members can do CRUD
CREATE POLICY "All org members can manage driver fuel cards"
ON public.driver_fuel_cards FOR ALL TO authenticated
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));
