-- Create trigger to auto-generate service history when work order is completed
CREATE OR REPLACE FUNCTION public.create_service_history_from_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.service_history (
      organization_id,
      vehicle_id,
      work_order_id,
      maintenance_schedule_id,
      service_type,
      service_date,
      technician_name,
      vendor_id,
      labor_cost,
      parts_cost,
      total_cost,
      description,
      notes
    ) VALUES (
      NEW.organization_id,
      NEW.vehicle_id,
      NEW.id,
      NEW.maintenance_schedule_id,
      COALESCE(NEW.service_category, NEW.work_type, 'General Service'),
      COALESCE(NEW.completed_date, now()),
      NEW.technician_name,
      NEW.vendor_id,
      COALESCE(NEW.labor_cost, 0),
      COALESCE(NEW.parts_cost, 0),
      COALESCE(NEW.total_cost, COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.parts_cost, 0)),
      NEW.service_description,
      NEW.notes
    );
    
    -- Update maintenance schedule if linked
    IF NEW.maintenance_schedule_id IS NOT NULL THEN
      UPDATE public.maintenance_schedules
      SET 
        last_service_date = COALESCE(NEW.completed_date, now()),
        last_service_odometer = NEW.odometer_at_service,
        next_due_date = CASE 
          WHEN interval_type = 'calendar' 
          THEN COALESCE(NEW.completed_date, now()) + (interval_value || ' days')::interval
          ELSE next_due_date
        END,
        next_due_odometer = CASE 
          WHEN interval_type = 'mileage' AND NEW.odometer_at_service IS NOT NULL
          THEN NEW.odometer_at_service + interval_value
          ELSE next_due_odometer
        END,
        updated_at = now()
      WHERE id = NEW.maintenance_schedule_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on work_orders
DROP TRIGGER IF EXISTS trigger_create_service_history ON public.work_orders;
CREATE TRIGGER trigger_create_service_history
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_service_history_from_work_order();

-- Create function to auto-generate work order from failed inspection
CREATE OR REPLACE FUNCTION public.create_work_order_from_inspection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  wo_number TEXT;
  defects_text TEXT;
BEGIN
  -- Only create WO for failed inspections or those needing repair
  IF NEW.status IN ('failed', 'pending_repair') AND NEW.certified_safe = false THEN
    -- Generate work order number
    wo_number := 'WO-INS-' || EXTRACT(EPOCH FROM now())::bigint::text;
    
    -- Extract defects as text
    IF NEW.defects_found IS NOT NULL AND NEW.defects_found ? 'items' THEN
      SELECT string_agg(item::text, ', ') INTO defects_text
      FROM jsonb_array_elements_text(NEW.defects_found->'items') AS item;
    ELSE
      defects_text := 'Issues found during inspection';
    END IF;
    
    -- Create work order
    INSERT INTO public.work_orders (
      organization_id,
      vehicle_id,
      inspection_id,
      work_order_number,
      work_type,
      priority,
      service_description,
      status,
      scheduled_date
    ) VALUES (
      NEW.organization_id,
      NEW.vehicle_id,
      NEW.id,
      wo_number,
      'inspection_repair',
      'high',
      'Repairs required from inspection: ' || COALESCE(defects_text, 'See inspection notes'),
      'pending',
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on vehicle_inspections
DROP TRIGGER IF EXISTS trigger_create_wo_from_inspection ON public.vehicle_inspections;
CREATE TRIGGER trigger_create_wo_from_inspection
  AFTER INSERT OR UPDATE ON public.vehicle_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.create_work_order_from_inspection();

-- Add quantity_used column to work_order_parts if it doesn't exist
ALTER TABLE public.work_order_parts 
ADD COLUMN IF NOT EXISTS quantity_used numeric DEFAULT 0;

-- Create function to update inventory when parts are used
CREATE OR REPLACE FUNCTION public.update_inventory_on_parts_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.inventory_item_id IS NOT NULL THEN
    UPDATE public.inventory_items
    SET 
      current_quantity = current_quantity - COALESCE(NEW.quantity_used, NEW.quantity),
      updated_at = now()
    WHERE id = NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on work_order_parts
DROP TRIGGER IF EXISTS trigger_update_inventory ON public.work_order_parts;
CREATE TRIGGER trigger_update_inventory
  AFTER INSERT ON public.work_order_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_parts_usage();