-- Enable realtime on the main user-facing entity tables.
-- Wrapped in DO blocks so the migration is idempotent (safe to re-run).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    -- Fleet & assets
    'fleet_assets','vehicle_inspections','vehicle_insurance','vehicle_warranties',
    'generators','rental_vehicles','vehicle_costs','vehicle_health_scores',
    'vehicle_owners','vehicle_tires','vehicle_calendar',
    -- Drivers & HR
    'driver_attendance','driver_leave_requests','driver_training','driver_training_progress',
    'driver_penalties','driver_groups','driver_group_members','driver_vehicle_assignments',
    'driver_incidents','driver_logbooks','driver_performance_kpis','driver_performance_reviews',
    'driver_payroll','driver_shift_schedules','driver_communications','driver_coaching_queue',
    'mechanics','employees',
    -- Requests & approvals
    'vehicle_request_assignments','vehicle_request_stops',
    'fuel_clarification_requests','fuel_emoney_approvals','fuel_wo_approvals',
    'tire_requests','tire_request_items',
    'safety_comfort_requests','safety_comfort_request_items','safety_comfort_issuances',
    -- Trips & dispatch
    'trips','trip_templates','routes','route_plans',
    'passenger_manifests','passenger_boardings',
    -- Maintenance & work orders
    'work_orders','work_order_operations','work_order_materials','work_order_approvals',
    'work_order_attachments','work_order_meter_readings','work_order_quality_plans',
    'maintenance_schedules','maintenance_tickets','maintenance_contracts',
    'maintenance_costs','maintenance_cost_tracking','maintenance_budgets',
    'maintenance_vendors','maintenance_supplier_assignments','maintenance_workflow_events',
    'parts_inventory','tire_inventory','tire_changes',
    'inspection_checklists','post_maintenance_inspections','incident_tickets',
    'supplier_bids','supplier_payment_requests','supplier_profiles',
    -- Fuel
    'fuel_transactions','fuel_events','fuel_work_orders',
    'fuel_depots','fuel_depot_dispensing','fuel_depot_receiving',
    'approved_fuel_stations','driver_fuel_cards','fuel_card_providers',
    'fuel_reconciliations','fuel_theft_cases',
    -- Safety, alerts, incidents
    'alerts','alert_rules','incidents','accident_claims','internal_accident_claims',
    'dash_cam_events','geofences','geofence_events',
    'panic_button_events','sos_alerts','traffic_violations','speed_violations',
    'roadside_assistance_requests','penalties_fines',
    -- Outsource & vendors
    'outsource_contracts','outsource_vehicle_attendance','outsource_driver_attendance',
    'outsource_payments','outsource_payment_requests','outsource_payment_request_items',
    'outsource_payment_approvals','outsource_price_catalogs','outsource_capacity_alerts',
    'vendors','contracts','purchase_orders',
    -- Organization
    'organizations','organization_settings','departments','depots','fleet_pools',
    'business_units','cost_centers','profiles','user_roles','custom_roles',
    -- Sensors & IoT
    'iot_sensors','sensors','sensor_calibrations','tpms_readings','door_sensor_events',
    -- Notifications
    'notifications','notification_center','notification_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Only attempt if the table actually exists and isn't already in the publication.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name=t
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      -- Ensure full row data is delivered so UPDATE/DELETE payloads are useful.
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    END IF;
  END LOOP;
END $$;