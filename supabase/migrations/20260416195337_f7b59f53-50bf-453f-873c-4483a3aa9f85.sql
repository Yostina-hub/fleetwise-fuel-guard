-- Persist E2E results so the read-only query tool can fetch them.
CREATE TABLE IF NOT EXISTS public.e2e_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  step text,
  flow text,
  status text,
  detail text
);
ALTER TABLE public.e2e_test_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins read e2e runs" ON public.e2e_test_runs;
CREATE POLICY "Super admins read e2e runs" ON public.e2e_test_runs
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Run the harness and capture results
DO $$
DECLARE
  v_run_at timestamptz := now();
  r record;
BEGIN
  FOR r IN SELECT * FROM public.run_maintenance_workflow_e2e_test() LOOP
    INSERT INTO public.e2e_test_runs (run_at, step, flow, status, detail)
    VALUES (v_run_at, r.step, r.flow, r.status, r.detail);
  END LOOP;
END $$;

GRANT SELECT ON public.e2e_test_runs TO supabase_read_only_user, authenticated, service_role;