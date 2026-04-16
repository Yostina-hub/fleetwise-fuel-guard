
-- Add new columns to fuel_requests for enhanced workflow
ALTER TABLE public.fuel_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'vehicle',
  ADD COLUMN IF NOT EXISTS generator_id uuid NULL,
  ADD COLUMN IF NOT EXISTS fuel_work_order_id uuid NULL,
  ADD COLUMN IF NOT EXISTS emoney_status text NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emoney_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS wallet_transfer_ref text NULL,
  ADD COLUMN IF NOT EXISTS actual_liters numeric NULL,
  ADD COLUMN IF NOT EXISTS deviation_percent numeric NULL,
  ADD COLUMN IF NOT EXISTS deviation_justification text NULL,
  ADD COLUMN IF NOT EXISTS clearance_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS previous_odometer numeric NULL,
  ADD COLUMN IF NOT EXISTS efficiency_km_per_liter numeric NULL;

-- Create generators table for generator fuel requests
CREATE TABLE IF NOT EXISTS public.generators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  model text NULL,
  serial_number text NULL,
  location text NULL,
  fuel_type text NOT NULL DEFAULT 'diesel',
  tank_capacity_liters numeric NULL,
  current_fuel_level_percent numeric NULL,
  status text NOT NULL DEFAULT 'active',
  last_refuel_date timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view generators in their org" ON public.generators
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage generators in their org" ON public.generators
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Create fuel_work_orders table
CREATE TABLE IF NOT EXISTS public.fuel_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  fuel_request_id uuid NOT NULL REFERENCES public.fuel_requests(id),
  work_order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  emoney_initiated boolean NOT NULL DEFAULT false,
  emoney_amount numeric NULL,
  emoney_approved_by uuid NULL,
  emoney_approved_at timestamptz NULL,
  emoney_transfer_status text NULL DEFAULT NULL,
  emoney_transfer_ref text NULL,
  driver_wallet_id text NULL,
  station_id uuid NULL REFERENCES public.approved_fuel_stations(id),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fuel work orders in their org" ON public.fuel_work_orders
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage fuel work orders in their org" ON public.fuel_work_orders
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Add FK from fuel_requests to generators
ALTER TABLE public.fuel_requests
  ADD CONSTRAINT fuel_requests_generator_id_fkey FOREIGN KEY (generator_id) REFERENCES public.generators(id);

-- Add FK from fuel_requests to fuel_work_orders
ALTER TABLE public.fuel_requests
  ADD CONSTRAINT fuel_requests_fuel_work_order_id_fkey FOREIGN KEY (fuel_work_order_id) REFERENCES public.fuel_work_orders(id);

-- Trigger to auto-create fuel work order when request is approved
CREATE OR REPLACE FUNCTION public.create_fuel_work_order_on_approval()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  wo_id UUID;
  wo_number TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    wo_number := 'FWO-' || EXTRACT(EPOCH FROM now())::bigint::text;
    
    INSERT INTO public.fuel_work_orders (
      organization_id, fuel_request_id, work_order_number, status, emoney_amount
    ) VALUES (
      NEW.organization_id, NEW.id, wo_number, 'pending',
      COALESCE(NEW.estimated_cost, 0)
    ) RETURNING id INTO wo_id;

    UPDATE public.fuel_requests SET fuel_work_order_id = wo_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_create_fuel_work_order
  AFTER UPDATE ON public.fuel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fuel_work_order_on_approval();

-- Trigger for post-fill deviation detection
CREATE OR REPLACE FUNCTION public.detect_fuel_deviation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_deviation NUMERIC;
BEGIN
  IF NEW.status = 'fulfilled' AND NEW.actual_liters IS NOT NULL AND NEW.liters_approved IS NOT NULL AND NEW.liters_approved > 0 THEN
    v_deviation := ((NEW.actual_liters - NEW.liters_approved) / NEW.liters_approved) * 100;
    
    NEW.deviation_percent := ROUND(v_deviation, 2);
    
    IF ABS(v_deviation) > 5 THEN
      NEW.clearance_status := 'deviation_detected';
    ELSE
      NEW.clearance_status := 'cleared';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_detect_fuel_deviation
  BEFORE UPDATE ON public.fuel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_fuel_deviation();

-- Add rate limit triggers
CREATE TRIGGER rate_limit_generators_inserts
  BEFORE INSERT ON public.generators
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

CREATE TRIGGER rate_limit_fuel_work_orders_inserts
  BEFORE INSERT ON public.fuel_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- Updated_at triggers
CREATE TRIGGER update_generators_updated_at
  BEFORE UPDATE ON public.generators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fuel_work_orders_updated_at
  BEFORE UPDATE ON public.fuel_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
