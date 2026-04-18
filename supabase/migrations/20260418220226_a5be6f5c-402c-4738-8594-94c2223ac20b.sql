
UPDATE public.fuel_requests
SET actual_liters = 48,
    actual_cost = 4550,
    fulfilled_at = now(),
    status = 'fulfilled',
    updated_at = now()
WHERE id = '42afc3d9-126a-4eba-9adf-f5694edb12f7';

UPDATE public.fuel_work_orders
SET status = 'closed',
    wo_status = 'closed',
    amount_used = 4550,
    amount_remaining = 0,
    updated_at = now()
WHERE id = '02033a10-a832-49f4-8ec4-c7f3188db88c';
