
-- Trigger fn: notify requester when fuel_requests.status -> fulfilled
CREATE OR REPLACE FUNCTION public.notify_fuel_request_fulfilled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'fulfilled'
     AND (OLD.status IS DISTINCT FROM 'fulfilled')
     AND NEW.requested_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, organization_id, link)
    VALUES (
      NEW.requested_by,
      'fuel_request_fulfilled',
      'Fuel request fulfilled',
      'Your fuel request ' || NEW.request_number ||
        ' has been fulfilled (' || COALESCE(NEW.actual_liters::text, '0') || ' L, ' ||
        COALESCE(NEW.actual_cost::text, '0') || ' ETB).',
      NEW.organization_id,
      '/fuel-requests?id=' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fuel_request_fulfilled ON public.fuel_requests;
CREATE TRIGGER trg_notify_fuel_request_fulfilled
AFTER UPDATE OF status ON public.fuel_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_fuel_request_fulfilled();

-- Trigger fn: notify requester when fuel_work_orders.status -> closed
CREATE OR REPLACE FUNCTION public.notify_fuel_wo_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester uuid;
  v_request_number text;
BEGIN
  IF NEW.status = 'closed'
     AND (OLD.status IS DISTINCT FROM 'closed')
     AND NEW.fuel_request_id IS NOT NULL THEN
    SELECT requested_by, request_number
      INTO v_requester, v_request_number
    FROM public.fuel_requests
    WHERE id = NEW.fuel_request_id;

    IF v_requester IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, organization_id, link)
      VALUES (
        v_requester,
        'fuel_wo_closed',
        'Fuel work order closed',
        'Work order ' || NEW.work_order_number ||
          ' for request ' || COALESCE(v_request_number, '') ||
          ' has been closed. Used: ' || COALESCE(NEW.amount_used::text, '0') ||
          ' ETB · Returned: ' || COALESCE(NEW.pullback_amount::text, '0') || ' ETB.',
        NEW.organization_id,
        '/work-orders'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fuel_wo_closed ON public.fuel_work_orders;
CREATE TRIGGER trg_notify_fuel_wo_closed
AFTER UPDATE OF status ON public.fuel_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_fuel_wo_closed();

-- Backfill: emit the missed notifications for the test WO/request we just closed
INSERT INTO public.notifications (user_id, type, title, message, organization_id, link)
SELECT fr.requested_by, 'fuel_request_fulfilled', 'Fuel request fulfilled',
  'Your fuel request ' || fr.request_number || ' has been fulfilled (' ||
    COALESCE(fr.actual_liters::text,'0') || ' L, ' || COALESCE(fr.actual_cost::text,'0') || ' ETB).',
  fr.organization_id, '/fuel-requests?id=' || fr.id
FROM public.fuel_requests fr
WHERE fr.id = '42afc3d9-126a-4eba-9adf-f5694edb12f7' AND fr.requested_by IS NOT NULL;

INSERT INTO public.notifications (user_id, type, title, message, organization_id, link)
SELECT fr.requested_by, 'fuel_wo_closed', 'Fuel work order closed',
  'Work order ' || wo.work_order_number || ' for request ' || fr.request_number ||
    ' has been closed. Used: ' || COALESCE(wo.amount_used::text,'0') ||
    ' ETB · Returned: ' || COALESCE(wo.pullback_amount::text,'0') || ' ETB.',
  wo.organization_id, '/work-orders'
FROM public.fuel_work_orders wo
JOIN public.fuel_requests fr ON fr.id = wo.fuel_request_id
WHERE wo.id = '02033a10-a832-49f4-8ec4-c7f3188db88c' AND fr.requested_by IS NOT NULL;
