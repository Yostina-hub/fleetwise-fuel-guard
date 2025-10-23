-- Create trip templates table
CREATE TABLE public.trip_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  purpose TEXT NOT NULL,
  required_class TEXT,
  passengers INTEGER DEFAULT 1,
  pickup_geofence_id UUID,
  drop_geofence_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved filters table
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  filter_name TEXT NOT NULL,
  filter_type TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Trip templates policies
CREATE POLICY "Users can view templates in their organization"
ON public.trip_templates FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create templates"
ON public.trip_templates FOR INSERT
WITH CHECK (
  organization_id = get_user_organization(auth.uid()) 
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own templates"
ON public.trip_templates FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
ON public.trip_templates FOR DELETE
USING (created_by = auth.uid());

-- Saved filters policies
CREATE POLICY "Users can view their own filters"
ON public.saved_filters FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own filters"
ON public.saved_filters FOR ALL
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_trip_templates_org ON public.trip_templates(organization_id);
CREATE INDEX idx_trip_templates_created_by ON public.trip_templates(created_by);
CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trip_templates_updated_at
BEFORE UPDATE ON public.trip_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_filters_updated_at
BEFORE UPDATE ON public.saved_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();