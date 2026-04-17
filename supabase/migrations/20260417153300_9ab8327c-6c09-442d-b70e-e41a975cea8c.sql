
-- Workflow human-task inbox + run pause/resume support

-- 1. workflow_runs: add 'awaiting_human' status & current step pointer
ALTER TABLE public.workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_status_check;
ALTER TABLE public.workflow_runs ADD CONSTRAINT workflow_runs_status_check
  CHECK (status IN ('running','awaiting_human','completed','failed','cancelled'));
ALTER TABLE public.workflow_runs ADD COLUMN IF NOT EXISTS current_node_id text;
ALTER TABLE public.workflow_runs ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. workflow_tasks — human-step inbox
CREATE TABLE IF NOT EXISTS public.workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  title text NOT NULL,
  description text,
  assignee_role text,
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  form_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','cancelled')),
  decision text,
  result jsonb,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_org_status ON public.workflow_tasks (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_run ON public.workflow_tasks (run_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_role ON public.workflow_tasks (organization_id, assignee_role) WHERE status='pending';

ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wf_tasks_select_own_org" ON public.workflow_tasks FOR SELECT TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "wf_tasks_insert_own_org" ON public.workflow_tasks FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization(auth.uid()));
CREATE POLICY "wf_tasks_update_own_org" ON public.workflow_tasks FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization(auth.uid()) OR is_super_admin(auth.uid()));

CREATE TRIGGER trg_wf_tasks_updated BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RPC: complete a task → resumes the workflow run via the runner
CREATE OR REPLACE FUNCTION public.complete_workflow_task(
  _task_id uuid,
  _decision text,
  _result jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task workflow_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM workflow_tasks WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.status <> 'pending' THEN RAISE EXCEPTION 'Task is not pending'; END IF;
  IF v_task.organization_id <> get_user_organization(auth.uid()) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE workflow_tasks
    SET status='completed', decision=_decision, result=_result,
        completed_at=now(), completed_by=auth.uid()
    WHERE id=_task_id;

  -- Re-queue the parent run for the runner to pick up
  UPDATE workflow_runs
    SET status='running', context = COALESCE(context,'{}'::jsonb) || jsonb_build_object(
          'last_task', jsonb_build_object('node_id', v_task.node_id, 'decision', _decision, 'result', _result)
        )
    WHERE id = v_task.run_id;

  RETURN jsonb_build_object('ok', true, 'run_id', v_task.run_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workflow_task(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_workflow_task(uuid, text, jsonb) TO authenticated;
