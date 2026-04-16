
-- Create workflow execution history table
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  total_nodes INTEGER NOT NULL DEFAULT 0,
  nodes_executed INTEGER NOT NULL DEFAULT 0,
  nodes_failed INTEGER NOT NULL DEFAULT 0,
  execution_logs JSONB DEFAULT '[]'::jsonb,
  db_reads INTEGER NOT NULL DEFAULT 0,
  db_writes INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_org_id ON public.workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions(started_at DESC);

-- Enable RLS
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view execution history in their org"
ON public.workflow_executions FOR SELECT TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can create execution records in their org"
ON public.workflow_executions FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update execution records in their org"
ON public.workflow_executions FOR UPDATE TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can delete execution records"
ON public.workflow_executions FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_workflow_executions_updated_at
BEFORE UPDATE ON public.workflow_executions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rate limiting
CREATE TRIGGER rate_limit_workflow_executions_inserts
BEFORE INSERT ON public.workflow_executions
FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;

-- Add last_executed_at and cron_expression to workflows table
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS cron_expression TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMPTZ;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS execution_count INTEGER NOT NULL DEFAULT 0;
