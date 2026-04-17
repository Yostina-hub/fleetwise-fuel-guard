
-- ============================================
-- AUTHORITY MATRIX (Real Delegation of Authority)
-- ============================================

CREATE TABLE IF NOT EXISTS public.authority_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- What kind of request this rule applies to
  scope TEXT NOT NULL CHECK (scope IN ('vehicle_request', 'fuel_request', 'work_order', 'trip', 'maintenance')),
  
  -- Human-readable rule name
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- The role that should approve when conditions match
  approver_role TEXT NOT NULL,
  
  -- Threshold conditions (NULL = no limit)
  min_amount NUMERIC,           -- ETB
  max_amount NUMERIC,           -- ETB
  min_duration_days INTEGER,    -- For trips/vehicle requests
  max_duration_days INTEGER,
  
  -- Roles that auto-approve their own requests at this scope
  auto_approve_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Step in chain (1 = first approver, 2 = second, etc.)
  step_order INTEGER NOT NULL DEFAULT 1,
  
  -- Lower number = checked first when multiple rules match
  priority INTEGER NOT NULL DEFAULT 100,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_authority_matrix_org_scope 
  ON public.authority_matrix(organization_id, scope, is_active);
CREATE INDEX IF NOT EXISTS idx_authority_matrix_priority 
  ON public.authority_matrix(organization_id, scope, priority, step_order);

ALTER TABLE public.authority_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view authority_matrix"
ON public.authority_matrix FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org admins can insert authority_matrix"
ON public.authority_matrix FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_owner'::app_role))
);

CREATE POLICY "Org admins can update authority_matrix"
ON public.authority_matrix FOR UPDATE TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_owner'::app_role))
);

CREATE POLICY "Org admins can delete authority_matrix"
ON public.authority_matrix FOR DELETE TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'super_admin'::app_role) 
       OR has_role(auth.uid(), 'org_admin'::app_role)
       OR has_role(auth.uid(), 'fleet_owner'::app_role))
);

CREATE TRIGGER trg_authority_matrix_updated_at
BEFORE UPDATE ON public.authority_matrix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RESOLVER FUNCTION
-- Returns approval chain (array of role steps) for a given request
-- ============================================

CREATE OR REPLACE FUNCTION public.resolve_authority_approver(
  p_organization_id UUID,
  p_scope TEXT,
  p_requester_role TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_duration_days INTEGER DEFAULT 0
)
RETURNS TABLE (
  step_order INTEGER,
  approver_role TEXT,
  rule_name TEXT,
  is_auto_approve BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto BOOLEAN := false;
BEGIN
  -- Check if requester role is in any auto_approve_roles list for this scope
  SELECT EXISTS (
    SELECT 1 FROM public.authority_matrix am
    WHERE am.organization_id = p_organization_id
      AND am.scope = p_scope
      AND am.is_active = true
      AND p_requester_role = ANY(am.auto_approve_roles)
      AND (am.min_amount IS NULL OR p_amount >= am.min_amount)
      AND (am.max_amount IS NULL OR p_amount <= am.max_amount)
      AND (am.min_duration_days IS NULL OR p_duration_days >= am.min_duration_days)
      AND (am.max_duration_days IS NULL OR p_duration_days <= am.max_duration_days)
  ) INTO v_auto;

  IF v_auto THEN
    RETURN QUERY SELECT 0, 'self'::TEXT, 'Auto-approval (manager+)'::TEXT, true;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT am.step_order, am.approver_role, am.rule_name, false
  FROM public.authority_matrix am
  WHERE am.organization_id = p_organization_id
    AND am.scope = p_scope
    AND am.is_active = true
    AND NOT (p_requester_role = ANY(am.auto_approve_roles))
    AND (am.min_amount IS NULL OR p_amount >= am.min_amount)
    AND (am.max_amount IS NULL OR p_amount <= am.max_amount)
    AND (am.min_duration_days IS NULL OR p_duration_days >= am.min_duration_days)
    AND (am.max_duration_days IS NULL OR p_duration_days <= am.max_duration_days)
  ORDER BY am.priority ASC, am.step_order ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_authority_approver(UUID, TEXT, TEXT, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_authority_approver(UUID, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;

-- ============================================
-- SEED DEFAULTS (one-time, idempotent per org)
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_authority_matrix_defaults(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.authority_matrix WHERE organization_id = p_org_id) THEN
    RETURN;
  END IF;

  -- VEHICLE REQUEST RULES
  INSERT INTO public.authority_matrix (organization_id, scope, rule_name, description, approver_role, max_duration_days, auto_approve_roles, step_order, priority) VALUES
    (p_org_id, 'vehicle_request', 'Short trip (≤15 days)', 'Manager approves trips of 15 days or less', 'operations_manager', 15, 
     ARRAY['super_admin','org_admin','fleet_owner','fleet_manager','operations_manager'], 1, 10),
    (p_org_id, 'vehicle_request', 'Long trip (>15 days)', 'Director approves trips longer than 15 days', 'org_admin', NULL, 
     ARRAY['super_admin','org_admin','fleet_owner'], 1, 20);

  -- Set min_duration on long-trip rule
  UPDATE public.authority_matrix SET min_duration_days = 16 
  WHERE organization_id = p_org_id AND scope = 'vehicle_request' AND rule_name = 'Long trip (>15 days)';

  -- FUEL REQUEST RULES (cost tiers in ETB)
  INSERT INTO public.authority_matrix (organization_id, scope, rule_name, description, approver_role, min_amount, max_amount, auto_approve_roles, step_order, priority) VALUES
    (p_org_id, 'fuel_request', 'Standard fuel (≤5,000 ETB)', 'Fleet manager approves routine fuel requests', 'fleet_manager', 0, 5000, 
     ARRAY['super_admin','org_admin','fleet_owner'], 1, 10),
    (p_org_id, 'fuel_request', 'High-cost fuel (>5,000 ETB)', 'Operations manager second approval', 'operations_manager', 5000.01, NULL, 
     ARRAY['super_admin','org_admin','fleet_owner'], 2, 20);

  -- WORK ORDER RULES (cost tiers in ETB)
  INSERT INTO public.authority_matrix (organization_id, scope, rule_name, description, approver_role, min_amount, max_amount, auto_approve_roles, step_order, priority) VALUES
    (p_org_id, 'work_order', 'Minor repairs (<5,000 ETB)', 'Auto-approved low-cost work orders', 'operations_manager', 0, 5000, 
     ARRAY['super_admin','org_admin','fleet_owner','fleet_manager'], 1, 10),
    (p_org_id, 'work_order', 'Standard repairs (5k-50k ETB)', 'Operations manager approval', 'operations_manager', 5000.01, 50000, 
     ARRAY['super_admin','org_admin','fleet_owner'], 1, 20),
    (p_org_id, 'work_order', 'Major repairs (>50k ETB)', 'Director approval required', 'org_admin', 50000.01, NULL, 
     ARRAY['super_admin'], 1, 30);

  -- TRIP RULES (distance/cost based)
  INSERT INTO public.authority_matrix (organization_id, scope, rule_name, description, approver_role, max_amount, auto_approve_roles, step_order, priority) VALUES
    (p_org_id, 'trip', 'Standard trip', 'Operations manager approves standard trips', 'operations_manager', 10000, 
     ARRAY['super_admin','org_admin','fleet_owner','fleet_manager'], 1, 10),
    (p_org_id, 'trip', 'High-cost trip (>10k ETB)', 'Director approval for expensive trips', 'org_admin', NULL, 
     ARRAY['super_admin','org_admin','fleet_owner'], 1, 20);

  UPDATE public.authority_matrix SET min_amount = 10000.01
  WHERE organization_id = p_org_id AND scope = 'trip' AND rule_name = 'High-cost trip (>10k ETB)';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_authority_matrix_defaults(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_authority_matrix_defaults(UUID) TO authenticated;

-- Seed for all existing orgs
DO $$
DECLARE
  v_org RECORD;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_authority_matrix_defaults(v_org.id);
  END LOOP;
END $$;

-- ============================================
-- UPDATE route_vehicle_request_approval to use matrix
-- ============================================

CREATE OR REPLACE FUNCTION public.route_vehicle_request_approval(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_requester_role TEXT;
  v_duration_days INTEGER;
  v_resolved RECORD;
  v_route_to TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_request FROM public.vehicle_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.needed_until IS NOT NULL THEN
    v_duration_days := EXTRACT(DAY FROM (v_request.needed_until::timestamp - v_request.needed_from::timestamp)) + 1;
  ELSE
    v_duration_days := 1;
  END IF;

  UPDATE public.vehicle_requests SET trip_duration_days = v_duration_days WHERE id = p_request_id;

  -- Get requester's highest role
  SELECT ur.role::text INTO v_requester_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_request.requester_id
  ORDER BY CASE ur.role::text
    WHEN 'super_admin' THEN 1
    WHEN 'org_admin' THEN 2
    WHEN 'fleet_owner' THEN 3
    WHEN 'fleet_manager' THEN 4
    WHEN 'operations_manager' THEN 5
    ELSE 10
  END
  LIMIT 1;

  -- Ensure org has matrix seeded
  PERFORM public.seed_authority_matrix_defaults(v_request.organization_id);

  -- Resolve approver from matrix
  SELECT * INTO v_resolved
  FROM public.resolve_authority_approver(
    v_request.organization_id, 'vehicle_request', v_requester_role, 0, v_duration_days
  )
  ORDER BY step_order ASC
  LIMIT 1;

  -- Auto-approve case
  IF v_resolved.is_auto_approve THEN
    UPDATE public.vehicle_requests 
    SET status = 'approved', approval_status = 'auto_approved', approval_routed_to = 'self',
        updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.vehicle_request_approvals (
      organization_id, request_id, approver_id, approver_name, approval_level,
      status, decision_at, comments
    ) VALUES (
      v_request.organization_id, p_request_id, v_request.requester_id, v_request.requester_name, 1,
      'approved', now(), 'Auto-approved per Authority Matrix: requester is ' || v_requester_role
    );

    RETURN 'auto_approved';
  END IF;

  -- Fallback if no matrix rule matched
  IF v_resolved.approver_role IS NULL THEN
    v_route_to := CASE WHEN v_duration_days <= 15 THEN 'operations_manager' ELSE 'org_admin' END;
  ELSE
    v_route_to := v_resolved.approver_role;
  END IF;

  UPDATE public.vehicle_requests 
  SET approval_status = 'pending_approval', approval_routed_to = v_route_to,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN v_route_to;
END;
$function$;

-- ============================================
-- Auto-seed matrix when new org is created
-- ============================================

CREATE OR REPLACE FUNCTION public.trg_seed_authority_matrix()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_authority_matrix_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_authority_matrix_on_org_create ON public.organizations;
CREATE TRIGGER trg_seed_authority_matrix_on_org_create
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_authority_matrix();
