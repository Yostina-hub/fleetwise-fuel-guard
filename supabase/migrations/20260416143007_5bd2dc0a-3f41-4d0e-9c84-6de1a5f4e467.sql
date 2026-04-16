-- Add work request fields to work_orders table
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'maintenance' CHECK (request_type IN ('maintenance', 'repair', 'inspection', 'preventive', 'emergency', 'body_work')),
  ADD COLUMN IF NOT EXISTS assigned_department text,
  ADD COLUMN IF NOT EXISTS requested_for text,
  ADD COLUMN IF NOT EXISTS asset_criticality text DEFAULT 'normal' CHECK (asset_criticality IN ('low', 'normal', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS request_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS request_completion_date timestamptz,
  ADD COLUMN IF NOT EXISTS km_reading numeric,
  ADD COLUMN IF NOT EXISTS driver_type text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS fuel_level numeric,
  ADD COLUMN IF NOT EXISTS remark text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text,
  ADD COLUMN IF NOT EXISTS created_by_email text,
  ADD COLUMN IF NOT EXISTS created_by_phone text,
  ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS notify_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_type text,
  ADD COLUMN IF NOT EXISTS auto_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approved_reason text;

-- Create function for fleet operations auto-approval
CREATE OR REPLACE FUNCTION public.auto_approve_work_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Check if the creator has fleet operations role (operations_manager, fleet_manager, super_admin)
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = NEW.created_by_user_id
    AND role IN ('operations_manager', 'fleet_manager', 'super_admin', 'maintenance_lead')
  LIMIT 1;

  IF v_user_role IS NOT NULL THEN
    NEW.approval_status := 'approved';
    NEW.auto_approved := true;
    NEW.auto_approved_reason := 'Auto-approved: Creator has ' || v_user_role || ' role';
    NEW.approved_at := now();
    NEW.approved_by := NEW.created_by_user_id;
    NEW.status := 'scheduled';
  ELSE
    NEW.approval_status := 'pending';
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-approval on insert
DROP TRIGGER IF EXISTS trg_auto_approve_work_order ON public.work_orders;
CREATE TRIGGER trg_auto_approve_work_order
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_work_order();