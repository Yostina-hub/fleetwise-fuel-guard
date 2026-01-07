-- Create scheduled_reports table to store scheduled report configurations
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_description TEXT,
  category TEXT NOT NULL,
  sub_id TEXT NOT NULL,
  
  -- Asset configuration
  selected_assets UUID[] DEFAULT '{}',
  asset_type TEXT DEFAULT 'all',
  
  -- Data period configuration
  data_period TEXT DEFAULT 'last_7_days',
  from_time TIME,
  to_time TIME,
  
  -- Scheduling configuration
  is_scheduled BOOLEAN NOT NULL DEFAULT true,
  schedule_rate TEXT NOT NULL DEFAULT 'daily',
  selected_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  starting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  at_time TIME NOT NULL DEFAULT '09:00:00',
  export_format TEXT NOT NULL DEFAULT 'pdf',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view scheduled reports in their organization"
  ON public.scheduled_reports
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can create scheduled reports in their organization"
  ON public.scheduled_reports
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can update scheduled reports in their organization"
  ON public.scheduled_reports
  FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can delete scheduled reports in their organization"
  ON public.scheduled_reports
  FOR DELETE
  USING (organization_id = get_user_organization(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_scheduled_reports_org ON public.scheduled_reports(organization_id);
CREATE INDEX idx_scheduled_reports_active ON public.scheduled_reports(is_active) WHERE is_active = true;