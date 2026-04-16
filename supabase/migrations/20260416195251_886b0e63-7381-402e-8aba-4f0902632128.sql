-- Allow the read-only Supabase tool role to invoke the E2E test harness.
GRANT EXECUTE ON FUNCTION public.run_maintenance_workflow_e2e_test() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_maintenance_workflow_e2e_test() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.e2e_set_user(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.e2e_check_stage(uuid, text) TO authenticated, anon, service_role;