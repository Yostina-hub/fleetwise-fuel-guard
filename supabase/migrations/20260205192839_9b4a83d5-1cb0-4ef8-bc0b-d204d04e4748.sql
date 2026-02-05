
-- Create workflows table for storing workflow builder data
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  trigger_type TEXT,
  trigger_config JSONB,
  is_template BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workflow execution logs
CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  trigger_data JSONB,
  execution_log JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view workflows in their org"
ON public.workflows FOR SELECT
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can create workflows in their org"
ON public.workflows FOR INSERT
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can update workflows in their org"
ON public.workflows FOR UPDATE
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can delete workflows in their org"
ON public.workflows FOR DELETE
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can view workflow runs in their org"
ON public.workflow_runs FOR SELECT
USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Users can create workflow runs in their org"
ON public.workflow_runs FOR INSERT
WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

-- Triggers
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
