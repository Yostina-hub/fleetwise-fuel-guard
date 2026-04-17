-- Hard-block: vehicle cannot be assigned to two overlapping active requests
CREATE OR REPLACE FUNCTION public.prevent_vehicle_double_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count INTEGER;
  v_conflict_request TEXT;
BEGIN
  -- Only check when a vehicle is actually being assigned
  IF NEW.assigned_vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if request itself is in a terminal/inactive state
  IF NEW.status IN ('completed', 'cancelled', 'rejected') OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), MIN(vr.request_number)
    INTO v_conflict_count, v_conflict_request
  FROM public.vehicle_requests vr
  WHERE vr.id <> NEW.id
    AND vr.assigned_vehicle_id = NEW.assigned_vehicle_id
    AND vr.deleted_at IS NULL
    AND vr.status NOT IN ('completed', 'cancelled', 'rejected')
    AND vr.driver_checked_out_at IS NULL
    AND vr.needed_from < NEW.needed_until
    AND vr.needed_until > NEW.needed_from;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Vehicle is already assigned to another active request (%) in an overlapping time window. Deallocate it first.', v_conflict_request
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vehicle_double_assignment ON public.vehicle_requests;
CREATE TRIGGER trg_prevent_vehicle_double_assignment
  BEFORE INSERT OR UPDATE OF assigned_vehicle_id ON public.vehicle_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vehicle_double_assignment();

-- Also guard the multi-vehicle assignments table
CREATE OR REPLACE FUNCTION public.prevent_vehicle_double_assignment_multi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count INTEGER;
  v_needed_from TIMESTAMPTZ;
  v_needed_until TIMESTAMPTZ;
BEGIN
  IF NEW.vehicle_id IS NULL OR NEW.status IN ('released', 'cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT needed_from, needed_until
    INTO v_needed_from, v_needed_until
  FROM public.vehicle_requests
  WHERE id = NEW.vehicle_request_id;

  IF v_needed_from IS NULL THEN
    RETURN NEW;
  END IF;

  -- Conflict against parent vehicle_requests
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.vehicle_requests vr
  WHERE vr.id <> NEW.vehicle_request_id
    AND vr.assigned_vehicle_id = NEW.vehicle_id
    AND vr.deleted_at IS NULL
    AND vr.status NOT IN ('completed', 'cancelled', 'rejected')
    AND vr.driver_checked_out_at IS NULL
    AND vr.needed_from < v_needed_until
    AND vr.needed_until > v_needed_from;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Vehicle is already allocated to another active request in an overlapping time window'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Conflict against other multi-assignment rows
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.vehicle_request_assignments vra
  JOIN public.vehicle_requests vr ON vr.id = vra.vehicle_request_id
  WHERE vra.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND vra.vehicle_id = NEW.vehicle_id
    AND vra.status NOT IN ('released', 'cancelled')
    AND vr.deleted_at IS NULL
    AND vr.status NOT IN ('completed', 'cancelled', 'rejected')
    AND vr.needed_from < v_needed_until
    AND vr.needed_until > v_needed_from;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Vehicle is already allocated to another active multi-vehicle assignment in an overlapping time window'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vehicle_double_assignment_multi ON public.vehicle_request_assignments;
CREATE TRIGGER trg_prevent_vehicle_double_assignment_multi
  BEFORE INSERT OR UPDATE OF vehicle_id ON public.vehicle_request_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vehicle_double_assignment_multi();