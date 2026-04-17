
CREATE TABLE IF NOT EXISTS public.outsource_payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_request_id UUID NOT NULL REFERENCES public.outsource_payment_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  rule_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','skipped')),
  acted_by UUID,
  acted_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payment_request_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_opa_request ON public.outsource_payment_approvals(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_opa_org ON public.outsource_payment_approvals(organization_id);

ALTER TABLE public.outsource_payment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read approvals"
  ON public.outsource_payment_approvals FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE POLICY "Org members create approvals"
  ON public.outsource_payment_approvals FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));

CREATE POLICY "Approvers update own approval steps"
  ON public.outsource_payment_approvals FOR UPDATE TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));

CREATE TRIGGER trg_opa_updated_at
  BEFORE UPDATE ON public.outsource_payment_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outsource_payment_requests
  ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_approval_steps INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.build_outsource_payment_approval_chain(
  _payment_request_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org UUID;
  _amount NUMERIC;
  _count INTEGER := 0;
BEGIN
  SELECT organization_id, amount_requested
    INTO _org, _amount
  FROM public.outsource_payment_requests
  WHERE id = _payment_request_id;

  IF _org IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  DELETE FROM public.outsource_payment_approvals
  WHERE payment_request_id = _payment_request_id;

  INSERT INTO public.outsource_payment_approvals (
    organization_id, payment_request_id, step_order, approver_role, rule_name, status
  )
  SELECT
    _org,
    _payment_request_id,
    ROW_NUMBER() OVER (ORDER BY step_order ASC) AS step_order,
    approver_role,
    rule_name,
    'pending'
  FROM public.authority_matrix
  WHERE organization_id = _org
    AND scope = 'outsource_payment'
    AND is_active = true
    AND (min_amount IS NULL OR _amount >= min_amount)
    AND (max_amount IS NULL OR _amount <= max_amount)
  ORDER BY step_order ASC;

  GET DIAGNOSTICS _count = ROW_COUNT;

  UPDATE public.outsource_payment_requests
  SET total_approval_steps = _count,
      current_approval_step = CASE WHEN _count > 0 THEN 1 ELSE 0 END
  WHERE id = _payment_request_id;

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.act_on_outsource_payment_approval(
  _payment_request_id UUID,
  _decision TEXT,
  _comments TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _step INTEGER;
  _total INTEGER;
  _required_role TEXT;
  _org UUID;
  _amount NUMERIC;
BEGIN
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT current_approval_step, total_approval_steps, organization_id, amount_requested
    INTO _step, _total, _org, _amount
  FROM public.outsource_payment_requests
  WHERE id = _payment_request_id;

  IF _step IS NULL OR _step = 0 THEN
    RAISE EXCEPTION 'No active approval step';
  END IF;

  SELECT approver_role INTO _required_role
  FROM public.outsource_payment_approvals
  WHERE payment_request_id = _payment_request_id
    AND step_order = _step;

  IF _required_role IS NULL THEN
    RAISE EXCEPTION 'Approval step not found';
  END IF;

  IF NOT public.has_role(_user, _required_role::app_role) THEN
    RAISE EXCEPTION 'You lack the % role required for this approval step', _required_role;
  END IF;

  UPDATE public.outsource_payment_approvals
  SET status = _decision,
      acted_by = _user,
      acted_at = now(),
      comments = _comments
  WHERE payment_request_id = _payment_request_id
    AND step_order = _step;

  IF _decision = 'rejected' THEN
    UPDATE public.outsource_payment_requests
    SET status = 'rejected',
        rejection_reason = COALESCE(_comments, 'Rejected at step ' || _step),
        current_approval_step = _step
    WHERE id = _payment_request_id;
    RETURN jsonb_build_object('result','rejected','step',_step);
  END IF;

  IF _step >= _total THEN
    UPDATE public.outsource_payment_requests
    SET status = 'approved',
        approved_at = now(),
        approver_id = _user,
        amount_approved = _amount,
        current_approval_step = _step
    WHERE id = _payment_request_id;
    RETURN jsonb_build_object('result','fully_approved','step',_step,'total',_total);
  ELSE
    UPDATE public.outsource_payment_requests
    SET current_approval_step = _step + 1
    WHERE id = _payment_request_id;
    RETURN jsonb_build_object('result','advanced','next_step',_step + 1,'total',_total);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_outsource_payment_approval_chain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.act_on_outsource_payment_approval(UUID, TEXT, TEXT) TO authenticated;
