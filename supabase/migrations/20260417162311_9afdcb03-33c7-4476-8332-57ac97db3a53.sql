ALTER TABLE public.workflow_tasks
  ADD COLUMN IF NOT EXISTS form_key text,
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_wf_tasks_form_key ON public.workflow_tasks(form_key) WHERE form_key IS NOT NULL;