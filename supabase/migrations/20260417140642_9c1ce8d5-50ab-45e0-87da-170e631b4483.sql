
-- Trigger function
CREATE OR REPLACE FUNCTION public.auto_create_inspection_from_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inspection_id uuid;
BEGIN
  IF NEW.request_type = 'inspection'
     AND NEW.inspection_id IS NULL
     AND NEW.vehicle_id IS NOT NULL THEN

    BEGIN
      INSERT INTO public.vehicle_inspections (
        organization_id, vehicle_id, driver_id,
        inspection_type, inspection_date, status,
        maintenance_request_id, outsource_stage, mechanic_notes
      ) VALUES (
        NEW.organization_id, NEW.vehicle_id, NEW.driver_id,
        COALESCE(NEW.request_subtype, 'annual'),
        now(), 'pending', NEW.id,
        CASE WHEN COALESCE(NEW.request_subtype, 'annual') = 'annual'
             THEN 'awaiting_approval' ELSE NULL END,
        'Auto-created from request ' || NEW.request_number
      )
      RETURNING id INTO v_inspection_id;

      NEW.inspection_id := v_inspection_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Inspection auto-create skipped for %: %', NEW.request_number, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_inspection_from_request ON public.maintenance_requests;
CREATE TRIGGER trg_auto_create_inspection_from_request
BEFORE INSERT ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_inspection_from_request();

-- Backfill helper that bypasses per-user rate limit (SECURITY DEFINER runs as table owner)
CREATE OR REPLACE FUNCTION public._backfill_inspection_links()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT mr.id, mr.organization_id, mr.vehicle_id, mr.driver_id,
           mr.request_subtype, mr.request_number
    FROM public.maintenance_requests mr
    LEFT JOIN public.vehicle_inspections vi
      ON vi.maintenance_request_id = mr.id
    WHERE mr.request_type = 'inspection'
      AND mr.inspection_id IS NULL
      AND mr.vehicle_id IS NOT NULL
      AND vi.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.vehicle_inspections (
        organization_id, vehicle_id, driver_id,
        inspection_type, inspection_date, status,
        maintenance_request_id, outsource_stage, mechanic_notes
      ) VALUES (
        r.organization_id, r.vehicle_id, r.driver_id,
        COALESCE(r.request_subtype, 'annual'),
        now(), 'pending', r.id,
        CASE WHEN COALESCE(r.request_subtype, 'annual') = 'annual'
             THEN 'awaiting_approval' ELSE NULL END,
        'Backfilled from request ' || r.request_number
      )
      RETURNING id INTO v_id;

      UPDATE public.maintenance_requests
         SET inspection_id = v_id
       WHERE id = r.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %: %', r.request_number, SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;
