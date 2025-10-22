-- =============================================
-- RLS POLICIES FOR ALL NEW TABLES
-- =============================================

-- VEHICLES
CREATE POLICY "Users can view vehicles in their organization"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
      OR public.has_role(auth.uid(), 'fleet_owner')
    )
  );

-- DEVICES
CREATE POLICY "Users can view devices in their organization"
  ON public.devices FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage devices"
  ON public.devices FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- SENSORS
CREATE POLICY "Users can view sensors in their organization"
  ON public.sensors FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage sensors"
  ON public.sensors FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- GEOFENCES
CREATE POLICY "Users can view geofences in their organization"
  ON public.geofences FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage geofences"
  ON public.geofences FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- TRIPS
CREATE POLICY "Users can view trips in their organization"
  ON public.trips FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Drivers can view their own trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "System can create trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can update trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- GEOFENCE EVENTS
CREATE POLICY "Users can view geofence events in their organization"
  ON public.geofence_events FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can create geofence events"
  ON public.geofence_events FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- TELEMETRY
CREATE POLICY "Users can view telemetry in their organization"
  ON public.telemetry FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can insert telemetry"
  ON public.telemetry FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- FUEL TRANSACTIONS
CREATE POLICY "Users can view fuel transactions in their organization"
  ON public.fuel_transactions FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Fuel controllers can manage fuel transactions"
  ON public.fuel_transactions FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'fuel_controller')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- FUEL EVENTS
CREATE POLICY "Users can view fuel events in their organization"
  ON public.fuel_events FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can create fuel events"
  ON public.fuel_events FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Fuel controllers can update fuel events"
  ON public.fuel_events FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'fuel_controller')
    )
  );

-- DRIVERS
CREATE POLICY "Users can view drivers in their organization"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Drivers can view their own profile"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Operations managers can manage drivers"
  ON public.drivers FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- DRIVER EVENTS
CREATE POLICY "Users can view driver events in their organization"
  ON public.driver_events FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can create driver events"
  ON public.driver_events FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- JOBS
CREATE POLICY "Users can view jobs in their organization"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Drivers can view their assigned jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Dispatchers can manage jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
      OR public.has_role(auth.uid(), 'dispatcher')
    )
  );

-- VENDORS
CREATE POLICY "Users can view vendors in their organization"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Maintenance leads can manage vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'maintenance_lead')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- WORK ORDERS
CREATE POLICY "Users can view work orders in their organization"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Maintenance leads can manage work orders"
  ON public.work_orders FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'maintenance_lead')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- ALERT RULES
CREATE POLICY "Users can view alert rules in their organization"
  ON public.alert_rules FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage alert rules"
  ON public.alert_rules FOR ALL
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

-- ALERTS
CREATE POLICY "Users can view alerts in their organization"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can acknowledge/resolve alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at
  BEFORE UPDATE ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_transactions_updated_at
  BEFORE UPDATE ON public.fuel_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_events_updated_at
  BEFORE UPDATE ON public.fuel_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();