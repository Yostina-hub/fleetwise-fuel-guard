GRANT EXECUTE ON FUNCTION public.run_maintenance_workflow_e2e_test() TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.cleanup_maintenance_workflow_e2e_test() TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.e2e_set_user(uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.e2e_check_stage(uuid, text) TO supabase_read_only_user;