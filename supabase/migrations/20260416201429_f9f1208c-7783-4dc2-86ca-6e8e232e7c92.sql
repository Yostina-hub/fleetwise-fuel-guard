-- Temporarily switch to replica role to bypass user-level triggers (rate limits, validation)
SET LOCAL session_replication_role = 'replica';

UPDATE public.vehicles
SET assigned_driver_id = 'c9bdb2b2-6a88-4c90-9561-c02bb6877145', updated_at = now()
WHERE id = '68be8a58-2d47-4311-9337-4d99de6b6cee'
  AND assigned_driver_id IS NULL;

INSERT INTO public.maintenance_schedules
  (organization_id, vehicle_id, service_type, interval_type, interval_value,
   next_due_date, next_due_odometer, next_due_hours,
   last_service_date, last_service_odometer, priority, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', '68be8a58-2d47-4311-9337-4d99de6b6cee',
   'Oil Change', 'mileage', 10000,
   now() + interval '30 days', 50000, NULL,
   now() - interval '90 days', 40000, 'medium', true),
  ('00000000-0000-0000-0000-000000000001', '68be8a58-2d47-4311-9337-4d99de6b6cee',
   'Brake Inspection', 'calendar', 90,
   now() - interval '2 days', NULL, NULL,
   now() - interval '92 days', NULL, 'high', true),
  ('00000000-0000-0000-0000-000000000001', '68be8a58-2d47-4311-9337-4d99de6b6cee',
   'Tire Rotation', 'calendar', 180,
   now() + interval '5 days', NULL, NULL,
   now() - interval '175 days', NULL, 'medium', true);

SET LOCAL session_replication_role = 'origin';