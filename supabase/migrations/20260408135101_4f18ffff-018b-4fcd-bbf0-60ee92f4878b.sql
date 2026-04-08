
-- Revoke from PUBLIC (which anon inherits from), then grant only to authenticated
-- This is the correct way to restrict function access in PostgreSQL

REVOKE EXECUTE ON FUNCTION public.clear_failed_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_failed_login(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_failed_login(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_account_lockout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_account_lockout(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.recalculate_driver_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_driver_stats(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_webhook(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_webhook(text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organization(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_in_organization(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_in_organization(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_vehicle_online(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_vehicle_online(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_vehicle_fuel_status(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_fuel_status(uuid[]) TO authenticated;

-- Trigger functions: revoke from PUBLIC, grant to service_role only (triggers run as owner anyway)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.assign_demo_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_demo_super_admin() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_notification_preferences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification_preferences() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_service_history_from_work_order() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_service_history_from_work_order() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_work_order_from_inspection() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_order_from_inspection() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_driver_trip_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_trip_stats() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_inventory_on_parts_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_inventory_on_parts_usage() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_insert_rate_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_insert_rate_limit() TO service_role;
