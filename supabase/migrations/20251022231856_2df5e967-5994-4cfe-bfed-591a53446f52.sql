
-- Create routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  route_name TEXT NOT NULL,
  route_code TEXT,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'adhoc')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for routes
CREATE POLICY "Users can view routes in their organization" 
ON public.routes FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage routes" 
ON public.routes FOR ALL 
USING (
  organization_id = get_user_organization(auth.uid()) AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'operations_manager'::app_role) OR
   has_role(auth.uid(), 'dispatcher'::app_role))
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('engine', 'transmission', 'brakes', 'tires', 'electrical', 'body', 'other')),
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can view inventory in their organization" 
ON public.inventory_items FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Maintenance leads can manage inventory" 
ON public.inventory_items FOR ALL 
USING (
  organization_id = get_user_organization(auth.uid()) AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'operations_manager'::app_role) OR
   has_role(auth.uid(), 'maintenance_lead'::app_role))
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  vehicle_id UUID,
  driver_id UUID,
  incident_number TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('accident', 'breakdown', 'violation', 'theft', 'damage')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  location TEXT,
  incident_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incidents
CREATE POLICY "Users can view incidents in their organization" 
ON public.incidents FOR SELECT 
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Operations managers can manage incidents" 
ON public.incidents FOR ALL 
USING (
  organization_id = get_user_organization(auth.uid()) AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'operations_manager'::app_role))
);

-- Create triggers for updated_at
CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
