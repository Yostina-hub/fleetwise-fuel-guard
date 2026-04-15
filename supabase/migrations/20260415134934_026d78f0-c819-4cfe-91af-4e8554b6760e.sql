
-- ================================================
-- 1. Approval Levels — configurable hierarchy
-- ================================================
CREATE TABLE public.approval_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level_order INT NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL,
  role TEXT NOT NULL,
  cost_threshold_min NUMERIC DEFAULT 0,
  cost_threshold_max NUMERIC DEFAULT 999999999,
  auto_approve_below NUMERIC DEFAULT 0,
  requires_all_prior BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, level_order)
);

ALTER TABLE public.approval_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_approval_levels" ON public.approval_levels
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "admins_manage_approval_levels" ON public.approval_levels
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'operations_manager'))
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'operations_manager'))
  );

CREATE TRIGGER update_approval_levels_updated_at
  BEFORE UPDATE ON public.approval_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- 2. Work Order Approvals — per-step tracking
-- ================================================
CREATE TABLE public.work_order_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  approval_level_id UUID NOT NULL REFERENCES public.approval_levels(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','delegated','skipped')),
  decision_at TIMESTAMPTZ,
  comments TEXT,
  delegated_to UUID REFERENCES public.profiles(id),
  delegated_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_wo_approvals" ON public.work_order_approvals
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "approvers_update_wo_approvals" ON public.work_order_approvals
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      approver_id = auth.uid()
      OR delegated_to = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "system_insert_wo_approvals" ON public.work_order_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
      OR public.has_role(auth.uid(), 'maintenance_lead')
    )
  );

CREATE INDEX idx_wo_approvals_work_order ON public.work_order_approvals(work_order_id);
CREATE INDEX idx_wo_approvals_approver ON public.work_order_approvals(approver_id);
CREATE INDEX idx_wo_approvals_status ON public.work_order_approvals(status);

CREATE TRIGGER update_wo_approvals_updated_at
  BEFORE UPDATE ON public.work_order_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- 3. Delegation Rules — configurable & time-based
-- ================================================
CREATE TABLE public.delegation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  delegator_id UUID NOT NULL,
  delegator_name TEXT NOT NULL,
  delegate_id UUID NOT NULL,
  delegate_name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'work_orders' CHECK (scope IN ('work_orders','approvals','all')),
  cost_limit NUMERIC,
  priority_limit TEXT CHECK (priority_limit IN ('low','medium','high','urgent', NULL)),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  auto_activate BOOLEAN DEFAULT false,
  activation_trigger TEXT CHECK (activation_trigger IN ('manual','schedule','absence', NULL)),
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delegation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_delegation_rules" ON public.delegation_rules
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "managers_manage_delegation_rules" ON public.delegation_rules
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      delegator_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      delegator_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'operations_manager')
    )
  );

CREATE INDEX idx_delegation_rules_active ON public.delegation_rules(organization_id, is_active, valid_from, valid_until);

CREATE TRIGGER update_delegation_rules_updated_at
  BEFORE UPDATE ON public.delegation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- 4. Helper function: find active delegate for a user
-- ================================================
CREATE OR REPLACE FUNCTION public.get_active_delegate(
  p_user_id UUID,
  p_scope TEXT DEFAULT 'approvals',
  p_cost NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT delegate_id
  FROM public.delegation_rules
  WHERE delegator_id = p_user_id
    AND is_active = true
    AND (scope = p_scope OR scope = 'all')
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until > now())
    AND (cost_limit IS NULL OR cost_limit >= p_cost)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- ================================================
-- 5. Function: initiate approval chain for a work order
-- ================================================
CREATE OR REPLACE FUNCTION public.initiate_work_order_approval(
  p_work_order_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_total_cost NUMERIC;
  v_level RECORD;
  v_approver_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id, COALESCE(total_cost, 0) INTO v_org_id, v_total_cost
  FROM public.work_orders
  WHERE id = p_work_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Delete any existing approval steps for this WO (re-initiation)
  DELETE FROM public.work_order_approvals WHERE work_order_id = p_work_order_id;

  FOR v_level IN
    SELECT * FROM public.approval_levels
    WHERE organization_id = v_org_id
      AND is_active = true
      AND v_total_cost >= cost_threshold_min
      AND v_total_cost <= cost_threshold_max
    ORDER BY level_order
  LOOP
    -- Auto-approve if below threshold
    IF v_total_cost < v_level.auto_approve_below THEN
      INSERT INTO public.work_order_approvals (
        organization_id, work_order_id, approval_level_id,
        status, decision_at, comments
      ) VALUES (
        v_org_id, p_work_order_id, v_level.id,
        'skipped', now(), 'Auto-approved: cost below threshold'
      );
    ELSE
      INSERT INTO public.work_order_approvals (
        organization_id, work_order_id, approval_level_id,
        status
      ) VALUES (
        v_org_id, p_work_order_id, v_level.id,
        'pending'
      );
    END IF;
  END LOOP;

  -- Update work order approval_status
  UPDATE public.work_orders
  SET approval_status = 'pending_approval', updated_at = now()
  WHERE id = p_work_order_id;
END;
$$;
