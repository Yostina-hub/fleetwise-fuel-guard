UPDATE public.vehicle_requests
SET assigned_driver_id = '5e72baf2-8f9a-4037-a8cb-591b979204a6',
    updated_at = now()
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'assigned'
  AND assigned_vehicle_id IS NOT NULL
  AND assigned_driver_id IS NULL;