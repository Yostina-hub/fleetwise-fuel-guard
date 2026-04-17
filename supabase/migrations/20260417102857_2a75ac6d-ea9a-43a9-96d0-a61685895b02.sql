
-- Make get_active_delegate honor BOTH delegation_rules AND delegation_matrix,
-- so substitutions saved from the Delegation > Substitutions UI actually
-- influence approval routing AND emit delegation_audit_log entries.

CREATE OR REPLACE FUNCTION public.get_active_delegate(
  p_user_id uuid,
  p_scope text DEFAULT 'approvals'::text,
  p_cost numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT delegate_id FROM (
    -- Configured delegation rules (work orders / approvals engine)
    SELECT delegate_id, created_at
    FROM public.delegation_rules
    WHERE delegator_id = p_user_id
      AND is_active = true
      AND (scope = p_scope OR scope = 'all')
      AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until > now())
      AND (cost_limit IS NULL OR cost_limit >= p_cost)

    UNION ALL

    -- Substitutions from the Delegation Matrix UI
    SELECT delegate_id, created_at
    FROM public.delegation_matrix
    WHERE delegator_id = p_user_id
      AND is_active = true
      AND (
        scope = p_scope
        OR scope = 'all'
        -- normalize singular vs plural mismatches between UI and engine
        OR (p_scope = 'fuel_requests' AND scope IN ('fuel_request','fuel_requests'))
        OR (p_scope = 'vehicle_requests' AND scope IN ('vehicle_request','vehicle_requests'))
        OR (p_scope = 'approvals' AND scope IN ('approvals','all'))
      )
      AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until > now())
  ) combined
  ORDER BY created_at DESC
  LIMIT 1;
$function$;
