
-- Add enhanced fields to fuel_requests
ALTER TABLE public.fuel_requests
  ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS driver_type TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_id_no TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_driver_name TEXT,
  ADD COLUMN IF NOT EXISTS requestor_department TEXT,
  ADD COLUMN IF NOT EXISTS fuel_in_telebirr NUMERIC,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT,
  ADD COLUMN IF NOT EXISTS fuel_by_cash_coupon NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_request_type TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_wo_number TEXT,
  ADD COLUMN IF NOT EXISTS project_number TEXT,
  ADD COLUMN IF NOT EXISTS task_number TEXT,
  ADD COLUMN IF NOT EXISTS remark TEXT,
  ADD COLUMN IF NOT EXISTS asset_criticality TEXT,
  ADD COLUMN IF NOT EXISTS additional_description TEXT,
  ADD COLUMN IF NOT EXISTS context_value TEXT DEFAULT 'Fuel request for vehicle',
  ADD COLUMN IF NOT EXISTS auto_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_trigger_efficiency NUMERIC;

-- Add configurable threshold settings to organization_settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS fuel_efficiency_threshold NUMERIC DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS fuel_auto_request_enabled BOOLEAN DEFAULT false;
