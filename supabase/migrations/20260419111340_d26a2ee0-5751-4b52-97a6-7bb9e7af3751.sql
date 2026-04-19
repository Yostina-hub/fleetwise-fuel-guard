CREATE OR REPLACE FUNCTION public.auto_create_work_order_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wo_id uuid;
  v_wo_number text;
  v_is_inspection boolean;
  v_is_annual boolean;
BEGIN
  v_is_inspection := (NEW.request_type = 'inspection');
  v_is_annual    := (NEW.request_subtype = 'annual');

  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.work_order_id IS NULL THEN
    v_wo_number := 'WO-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

    INSERT INTO public.work_orders (
      organization_id, vehicle_id, work_order_number, work_type, priority,
      service_description, service_category, status,
      request_type, request_start_date, request_completion_date,
      km_reading, driver_type, driver_phone, fuel_level,
      remark, additional_description, context_value, asset_criticality,
      created_by_user_id, contact_preference, notify_user, supplier_name,
      approval_status, approved_by, approved_at,
      maintenance_type, activity_type, activity_cause,
      assigned_department, maintenance_schedule_id
    ) VALUES (
      NEW.organization_id, NEW.vehicle_id, v_wo_number,
      CASE WHEN v_is_inspection THEN 'inspection' ELSE COALESCE(NEW.request_type,'corrective') END,
      COALESCE(NEW.priority,'medium'),
      COALESCE(NEW.description, NEW.additional_description, 'Auto-generated from request '||NEW.request_number),
      CASE WHEN v_is_annual THEN 'annual_inspection'
           WHEN NEW.request_subtype = 'pre_trip' THEN 'pre_trip_inspection'
           WHEN NEW.request_subtype = 'post_trip' THEN 'post_trip_inspection'
           ELSE 'general' END,
      'open',
      NEW.request_type, NEW.request_start_date, NEW.request_by_completion_date,
      NEW.km_reading, NEW.driver_type, NEW.driver_phone, NEW.fuel_level,
      NEW.remark, NEW.additional_description, NEW.context_value, NEW.asset_criticality,
      NEW.requested_by, NEW.contact_preference, COALESCE(NEW.notify_user,false), NEW.supplier_name,
      'approved', NEW.approved_by, COALESCE(NEW.approved_at, now()),
      CASE WHEN v_is_annual THEN 'outsourced' ELSE 'internal' END,
      CASE WHEN v_is_inspection THEN 'inspection' ELSE 'repair' END,
      'request',
      NEW.requestor_department,
      NEW.schedule_id
    ) RETURNING id INTO v_wo_id;

    NEW.work_order_id := v_wo_id;

    -- Back-link inspection if one exists
    IF NEW.inspection_id IS NOT NULL THEN
      UPDATE public.vehicle_inspections
        SET work_order_id = v_wo_id,
            outsource_stage = CASE WHEN v_is_annual THEN 'sourcing' ELSE outsource_stage END
        WHERE id = NEW.inspection_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;