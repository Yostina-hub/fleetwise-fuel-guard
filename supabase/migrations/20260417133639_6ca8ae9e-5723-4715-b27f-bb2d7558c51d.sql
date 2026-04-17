-- Hybrid post-trip enforcement: lock vehicle until post-trip inspection is filed.
-- 1) When auto-create posts a "pending" post_trip row, mark the vehicle as awaiting_post_trip
--    (status = 'in_use' is preserved but we set a flag column).
-- 2) When that inspection is updated to a final status, restore the vehicle.

-- Add column flag (idempotent)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS awaiting_post_trip_inspection_id uuid
    REFERENCES public.vehicle_inspections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_awaiting_post_trip
  ON public.vehicles(awaiting_post_trip_inspection_id)
  WHERE awaiting_post_trip_inspection_id IS NOT NULL;

-- Trigger fn: on INSERT of a pending post_trip inspection, lock the vehicle.
CREATE OR REPLACE FUNCTION public.lock_vehicle_on_pending_post_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_type = 'post_trip' AND NEW.status = 'pending' THEN
    UPDATE public.vehicles
       SET awaiting_post_trip_inspection_id = NEW.id
     WHERE id = NEW.vehicle_id
       AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_vehicle_on_pending_post_trip ON public.vehicle_inspections;
CREATE TRIGGER trg_lock_vehicle_on_pending_post_trip
  AFTER INSERT ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.lock_vehicle_on_pending_post_trip();

-- Trigger fn: on UPDATE that finalises a post_trip inspection, unlock the vehicle.
-- 'passed'        -> vehicles.status = 'available' (if it was in_use)
-- 'pending_repair'-> vehicles.status = 'out_of_service'
-- Either way clear the lock pointer.
CREATE OR REPLACE FUNCTION public.unlock_vehicle_on_post_trip_finalised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_type = 'post_trip'
     AND OLD.status = 'pending'
     AND NEW.status IN ('passed', 'pending_repair', 'failed') THEN
    UPDATE public.vehicles
       SET awaiting_post_trip_inspection_id = NULL,
           status = CASE
             WHEN NEW.status IN ('pending_repair','failed') THEN 'out_of_service'
             WHEN status = 'in_use' THEN 'available'
             ELSE status
           END
     WHERE id = NEW.vehicle_id
       AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_vehicle_on_post_trip_finalised ON public.vehicle_inspections;
CREATE TRIGGER trg_unlock_vehicle_on_post_trip_finalised
  AFTER UPDATE ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.unlock_vehicle_on_post_trip_finalised();