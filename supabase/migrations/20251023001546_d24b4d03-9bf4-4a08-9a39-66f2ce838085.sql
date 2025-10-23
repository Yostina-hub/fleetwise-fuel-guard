-- Create ERPNext integration configuration table
CREATE TABLE IF NOT EXISTS public.erpnext_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  erpnext_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sync_settings JSONB DEFAULT '{
    "sync_vehicles": true,
    "sync_drivers": true,
    "sync_fuel_transactions": true,
    "sync_maintenance": true,
    "sync_trips": true,
    "sync_incidents": true,
    "auto_sync": true,
    "sync_interval_minutes": 30
  }'::jsonb,
  field_mappings JSONB DEFAULT '{
    "vehicle_doctype": "Vehicle",
    "driver_doctype": "Employee",
    "fuel_doctype": "Expense Claim",
    "maintenance_doctype": "Asset Maintenance",
    "trip_doctype": "Delivery Trip"
  }'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erpnext_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage ERPNext config"
  ON public.erpnext_config
  FOR ALL
  USING (
    organization_id = get_user_organization(auth.uid()) 
    AND has_role(auth.uid(), 'super_admin')
  );

-- Create ERPNext sync logs table
CREATE TABLE IF NOT EXISTS public.erpnext_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  config_id UUID NOT NULL REFERENCES public.erpnext_config(id),
  sync_type TEXT NOT NULL, -- 'manual', 'auto', 'scheduled'
  entity_type TEXT NOT NULL, -- 'vehicle', 'driver', 'fuel', etc.
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erpnext_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ERPNext sync logs"
  ON public.erpnext_sync_logs
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_erpnext_config_updated_at
  BEFORE UPDATE ON public.erpnext_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_erpnext_config_org ON public.erpnext_config(organization_id);
CREATE INDEX idx_erpnext_sync_logs_org ON public.erpnext_sync_logs(organization_id);
CREATE INDEX idx_erpnext_sync_logs_created ON public.erpnext_sync_logs(created_at DESC);