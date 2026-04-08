
-- ============================================================
-- CRITICAL: Revoke anonymous access to all SECURITY DEFINER functions
-- Prevents unauthenticated attackers from calling privileged functions
-- ============================================================

-- Revoke EXECUTE from anon on ALL public security definer functions
REVOKE EXECUTE ON FUNCTION public.clear_failed_login(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_failed_login(text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_account_lockout(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_driver_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_webhook(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_organization(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_in_organization(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_vehicle_online(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vehicle_fuel_status(uuid[]) FROM anon;

-- Also revoke from anon on internal trigger functions (should never be called directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_demo_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_preferences() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_service_history_from_work_order() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_work_order_from_inspection() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_driver_trip_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_inventory_on_parts_usage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_insert_rate_limit() FROM anon;

-- ============================================================
-- Harden callable functions with internal auth.uid() guards
-- Even authenticated users should not call certain functions arbitrarily
-- ============================================================

-- Harden clear_failed_login: only super_admin should clear lockouts
CREATE OR REPLACE FUNCTION public.clear_failed_login(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  UPDATE account_lockouts SET failed_attempts = 0, lockout_until = NULL, lockout_reason = NULL, updated_at = now() WHERE email = p_email;
END;
$function$;

-- Harden recalculate_driver_stats: only super_admin
CREATE OR REPLACE FUNCTION public.recalculate_driver_stats(p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  UPDATE public.drivers d
  SET 
    total_trips = COALESCE(stats.trip_count, 0),
    total_distance_km = COALESCE(stats.total_km, 0),
    updated_at = now()
  FROM (
    SELECT 
      driver_id,
      COUNT(*) as trip_count,
      COALESCE(SUM(distance_km), 0) as total_km
    FROM public.trips
    WHERE status = 'completed' 
      AND driver_id IS NOT NULL
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    GROUP BY driver_id
  ) stats
  WHERE d.id = stats.driver_id
    AND (p_organization_id IS NULL OR d.organization_id = p_organization_id);
END;
$function$;

-- Harden send_notification: require authenticated caller
CREATE OR REPLACE FUNCTION public.send_notification(_user_id uuid, _type text, _title text, _message text, _link text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id UUID;
  _notification_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  _org_id := get_user_organization(_user_id);
  IF _org_id IS NULL THEN RETURN NULL; END IF;
  
  INSERT INTO public.notifications (
    organization_id, user_id, type, title, message, link, metadata
  ) VALUES (
    _org_id, _user_id, _type, _title, _message, _link, _metadata
  ) RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$function$;

-- Harden log_audit_event: require authenticated caller
CREATE OR REPLACE FUNCTION public.log_audit_event(_action text, _resource_type text, _resource_id uuid DEFAULT NULL::uuid, _old_values jsonb DEFAULT NULL::jsonb, _new_values jsonb DEFAULT NULL::jsonb, _status text DEFAULT 'success'::text, _error_message text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id UUID;
  _audit_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  _org_id := get_user_organization(auth.uid());
  IF _org_id IS NULL THEN RETURN NULL; END IF;
  
  INSERT INTO public.audit_logs (
    organization_id, user_id, action, resource_type, resource_id,
    old_values, new_values, status, error_message
  ) VALUES (
    _org_id, auth.uid(), _action, _resource_type, _resource_id,
    _old_values, _new_values, _status, _error_message
  ) RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$function$;

-- Harden trigger_webhook: require authenticated caller
CREATE OR REPLACE FUNCTION public.trigger_webhook(_event_type text, _event_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id UUID;
  _subscription RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  _org_id := get_user_organization(auth.uid());
  IF _org_id IS NULL THEN RETURN; END IF;
  
  FOR _subscription IN
    SELECT id, url, secret, headers
    FROM public.webhook_subscriptions
    WHERE organization_id = _org_id
      AND is_active = true
      AND _event_type = ANY(events)
  LOOP
    INSERT INTO public.webhook_deliveries (
      subscription_id, event_type, event_data, status
    ) VALUES (
      _subscription.id, _event_type, _event_data, 'pending'
    );
  END LOOP;
END;
$function$;
