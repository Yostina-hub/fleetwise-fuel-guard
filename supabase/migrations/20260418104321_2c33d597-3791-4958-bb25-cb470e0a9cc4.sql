-- Recycle bin support for workflow_instances (SOP tasks) and workflow_tasks (visual builder)
ALTER TABLE public.workflow_instances
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text;

CREATE INDEX IF NOT EXISTS idx_wf_instances_archived
  ON public.workflow_instances (organization_id, archived_at)
  WHERE archived_at IS NOT NULL;

-- Best-effort: only patch workflow_tasks if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_tasks') THEN
    EXECUTE 'ALTER TABLE public.workflow_tasks
              ADD COLUMN IF NOT EXISTS archived_at timestamptz,
              ADD COLUMN IF NOT EXISTS archived_by uuid,
              ADD COLUMN IF NOT EXISTS archive_reason text';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wf_tasks_archived
              ON public.workflow_tasks (archived_at)
              WHERE archived_at IS NOT NULL';
  END IF;
END $$;