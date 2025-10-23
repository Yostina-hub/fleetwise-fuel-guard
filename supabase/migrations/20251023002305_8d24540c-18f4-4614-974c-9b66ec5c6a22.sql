-- Update ERPNext config to support all data types
ALTER TABLE public.erpnext_config 
ALTER COLUMN sync_settings SET DEFAULT '{
  "sync_vehicles": true,
  "sync_drivers": true,
  "sync_fuel_transactions": true,
  "sync_maintenance": true,
  "sync_trips": true,
  "sync_incidents": true,
  "sync_alerts": true,
  "sync_gps_data": true,
  "sync_driver_events": true,
  "auto_sync": true,
  "sync_interval_minutes": 30
}'::jsonb;

ALTER TABLE public.erpnext_config 
ALTER COLUMN field_mappings SET DEFAULT '{
  "vehicle_doctype": "Vehicle",
  "driver_doctype": "Employee",
  "fuel_doctype": "Expense Claim",
  "maintenance_doctype": "Asset Maintenance",
  "trip_doctype": "Delivery Trip",
  "alert_doctype": "Issue",
  "incident_doctype": "Issue",
  "driver_event_doctype": "Comment"
}'::jsonb;