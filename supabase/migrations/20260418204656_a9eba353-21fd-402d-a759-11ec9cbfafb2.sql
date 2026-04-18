
-- Add a trigger on fuel_request_approvals so each newly-routed pending step
-- pushes a row into public.notifications for the assigned approver.
-- This is what powers the bell/notification dialog in the app.

CREATE OR REPLACE FUNCTION public.notify_fuel_request_approver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_requester_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only notify on newly-pending approval rows
  IF NEW.action IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.approver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fr.request_number, fr.fuel_type, fr.liters_requested, fr.requested_by, fr.id
  INTO v_request
  FROM public.fuel_requests fr
  WHERE fr.id = NEW.fuel_request_id;

  IF v_request IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.email, 'Driver') INTO v_requester_name
  FROM public.profiles p
  WHERE p.id = v_request.requested_by;

  v_title := format('Fuel approval needed: %s', v_request.request_number);
  v_message := format(
    'Step %s — %s submitted a %s fuel request for %s L. Please review and approve.',
    NEW.step,
    COALESCE(v_requester_name, 'A driver'),
    COALESCE(v_request.fuel_type, 'fuel'),
    COALESCE(v_request.liters_requested::text, '0')
  );

  INSERT INTO public.notifications (
    organization_id, user_id, type, title, message, link, metadata, is_read
  ) VALUES (
    NEW.organization_id,
    NEW.approver_id,
    'fuel_request_approval',
    v_title,
    v_message,
    '/fuel-requests',
    jsonb_build_object(
      'fuel_request_id', NEW.fuel_request_id,
      'approval_id', NEW.id,
      'step', NEW.step,
      'approver_role', NEW.approver_role,
      'request_number', v_request.request_number
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fuel_request_approver ON public.fuel_request_approvals;
CREATE TRIGGER trg_notify_fuel_request_approver
AFTER INSERT ON public.fuel_request_approvals
FOR EACH ROW
EXECUTE FUNCTION public.notify_fuel_request_approver();
