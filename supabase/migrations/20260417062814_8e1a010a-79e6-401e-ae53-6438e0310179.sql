-- 1. Soft-delete + deallocation tracking columns
ALTER TABLE public.vehicle_requests
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
  ADD COLUMN IF NOT EXISTS deallocated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deallocated_by UUID,
  ADD COLUMN IF NOT EXISTS deallocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS deallocation_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_not_deleted
  ON public.vehicle_requests (organization_id, status)
  WHERE deleted_at IS NULL;

-- 2. Multi-vehicle assignment child table
CREATE TABLE IF NOT EXISTS public.vehicle_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_request_id UUID NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  driver_checked_in_at TIMESTAMPTZ,
  driver_checked_out_at TIMESTAMPTZ,
  checkin_odometer NUMERIC,
  checkout_odometer NUMERIC,
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vehicle_request_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vra_request ON public.vehicle_request_assignments(vehicle_request_id);
CREATE INDEX IF NOT EXISTS idx_vra_driver_active ON public.vehicle_request_assignments(driver_id) WHERE driver_checked_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vra_vehicle_active ON public.vehicle_request_assignments(vehicle_id) WHERE driver_checked_out_at IS NULL;

ALTER TABLE public.vehicle_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-org users can view assignments"
  ON public.vehicle_request_assignments FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Same-org users can create assignments"
  ON public.vehicle_request_assignments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Same-org users can update assignments"
  ON public.vehicle_request_assignments FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Same-org users can delete assignments"
  ON public.vehicle_request_assignments FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE TRIGGER vra_set_updated_at
  BEFORE UPDATE ON public.vehicle_request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Hard-block: driver cannot have two overlapping vehicle assignments
CREATE OR REPLACE FUNCTION public.prevent_driver_double_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_from TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
  v_conflict_count INTEGER;
BEGIN
  IF NEW.assigned_driver_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_driver_id IS NOT DISTINCT FROM NEW.assigned_driver_id THEN
    RETURN NEW;
  END IF;

  v_new_from := NEW.needed_from;
  v_new_until := NEW.needed_until;
  IF v_new_from IS NULL OR v_new_until IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.vehicle_requests vr
  WHERE vr.id <> NEW.id
    AND vr.assigned_driver_id = NEW.assigned_driver_id
    AND vr.deleted_at IS NULL
    AND vr.driver_checked_out_at IS NULL
    AND COALESCE(vr.status,'') NOT IN ('completed','cancelled','rejected')
    AND vr.needed_from < v_new_until
    AND vr.needed_until > v_new_from;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Driver already assigned to another vehicle in an overlapping time window'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_double_assignment ON public.vehicle_requests;
CREATE TRIGGER trg_prevent_driver_double_assignment
  BEFORE INSERT OR UPDATE OF assigned_driver_id ON public.vehicle_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_double_assignment();

CREATE OR REPLACE FUNCTION public.prevent_vra_driver_double_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from TIMESTAMPTZ;
  v_until TIMESTAMPTZ;
  v_conflict INTEGER;
BEGIN
  IF NEW.driver_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.driver_id IS NOT DISTINCT FROM NEW.driver_id THEN RETURN NEW; END IF;

  SELECT needed_from, needed_until INTO v_from, v_until
  FROM public.vehicle_requests WHERE id = NEW.vehicle_request_id;

  IF v_from IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_conflict
  FROM public.vehicle_requests vr
  WHERE vr.id <> NEW.vehicle_request_id
    AND vr.assigned_driver_id = NEW.driver_id
    AND vr.deleted_at IS NULL
    AND vr.driver_checked_out_at IS NULL
    AND COALESCE(vr.status,'') NOT IN ('completed','cancelled','rejected')
    AND vr.needed_from < v_until AND vr.needed_until > v_from;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'Driver already assigned to another vehicle in an overlapping time window'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO v_conflict
  FROM public.vehicle_request_assignments a
  JOIN public.vehicle_requests vr ON vr.id = a.vehicle_request_id
  WHERE a.id <> NEW.id
    AND a.driver_id = NEW.driver_id
    AND a.driver_checked_out_at IS NULL
    AND vr.deleted_at IS NULL
    AND vr.needed_from < v_until AND vr.needed_until > v_from;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'Driver already assigned to another vehicle in an overlapping time window'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vra_driver_double_assignment ON public.vehicle_request_assignments;
CREATE TRIGGER trg_prevent_vra_driver_double_assignment
  BEFORE INSERT OR UPDATE OF driver_id ON public.vehicle_request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vra_driver_double_assignment();