-- Create email report configurations table
CREATE TABLE public.email_report_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day TIME NOT NULL DEFAULT '08:00:00',
  recipient_emails TEXT[] NOT NULL,
  vehicle_ids UUID[] NOT NULL,
  include_trend_analysis BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_report_configs ENABLE ROW LEVEL SECURITY;

-- Policies for email report configs
CREATE POLICY "Users can view their organization's report configs"
ON public.email_report_configs
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create report configs"
ON public.email_report_configs
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update report configs"
ON public.email_report_configs
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete report configs"
ON public.email_report_configs
FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_email_report_configs_updated_at
BEFORE UPDATE ON public.email_report_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_email_report_configs_active ON public.email_report_configs(is_active) WHERE is_active = true;