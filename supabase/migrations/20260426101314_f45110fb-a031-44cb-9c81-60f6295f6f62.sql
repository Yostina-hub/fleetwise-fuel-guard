-- 1. Link column on incidents to the auto-spawned work order
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS auto_work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_auto_wo ON public.incidents(auto_work_order_id);

-- 2. Trigger function: auto-create a work order for vehicle_technical / accident incidents
CREATE OR REPLACE FUNCTION public.auto_create_wo_for_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority text;
  v_work_type text;
  v_wo_id uuid;
  v_wo_number text;
  v_service_desc text;
BEGIN
  -- Only escalate vehicle technical (breakdown) and accidents
  IF NEW.incident_type NOT IN ('accident','breakdown') THEN
    RETURN NEW;
  END IF;

  -- Skip if no vehicle (work_orders.vehicle_id is NOT NULL)
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map severity / type → priority + work_type
  IF NEW.incident_type = 'accident' THEN
    v_priority := 'urgent';
    v_work_type := 'accident_repair';
  ELSE
    v_priority := CASE WHEN NEW.severity IN ('critical','high') THEN 'high' ELSE 'medium' END;
    v_work_type := 'breakdown_repair';
  END IF;

  v_wo_number := 'WO-AUTO-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(NEW.id::text,'-',''),1,6);
  v_service_desc := COALESCE(NEW.description, 'Auto-escalated from incident ' || NEW.incident_number);

  INSERT INTO public.work_orders (
    organization_id, vehicle_id, work_order_number, work_type, priority,
    service_description, status, approval_status, request_type,
    asset_criticality, km_reading, remark, created_by_user_id,
    notify_user, contact_preference
  ) VALUES (
    NEW.organization_id, NEW.vehicle_id, v_wo_number, v_work_type, v_priority,
    v_service_desc, 'pending', 'pending', 'maintenance',
    CASE WHEN v_priority = 'urgent' THEN 'critical' ELSE 'high' END,
    NEW.km_reading,
    'Auto-escalated from incident #' || NEW.incident_number,
    NEW.driver_id,
    true, 'phone'
  )
  RETURNING id INTO v_wo_id;

  -- Link back
  NEW.auto_work_order_id := v_wo_id;

  RETURN NEW;
END;
$$;

-- 3. Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trg_auto_wo_on_incident ON public.incidents;
CREATE TRIGGER trg_auto_wo_on_incident
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_wo_for_incident();