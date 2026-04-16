-- ============= 1. Extend fuel_work_orders for Telebirr lifecycle =============
ALTER TABLE public.fuel_work_orders
  ADD COLUMN IF NOT EXISTS telebirr_provider text DEFAULT 'stub',          -- 'real' | 'stub'
  ADD COLUMN IF NOT EXISTS telebirr_request_id text,
  ADD COLUMN IF NOT EXISTS pin_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_confirmation_ref text,
  ADD COLUMN IF NOT EXISTS sms_receipt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_receipt_text text,
  ADD COLUMN IF NOT EXISTS amount_used numeric,
  ADD COLUMN IF NOT EXISTS amount_remaining numeric,
  ADD COLUMN IF NOT EXISTS pullback_initiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pullback_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pullback_ref text,
  ADD COLUMN IF NOT EXISTS pullback_amount numeric;

-- ============= 2. Extend fuel_requests for clarification loop =============
ALTER TABLE public.fuel_requests
  ADD COLUMN IF NOT EXISTS clarification_status text,                       -- 'requested'|'justified'|'approved'|'rejected'
  ADD COLUMN IF NOT EXISTS clearance_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS clearance_approved_by uuid REFERENCES auth.users(id);

-- ============= 3. Clarification requests (step 16/17) =============
CREATE TABLE IF NOT EXISTS public.fuel_clarification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  fuel_request_id uuid NOT NULL REFERENCES public.fuel_requests(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  question text NOT NULL,
  justification text,
  justified_by uuid REFERENCES auth.users(id),
  justified_at timestamptz,
  status text NOT NULL DEFAULT 'open',        -- 'open'|'answered'|'closed'
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution text,                            -- 'approved' | 'rejected'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fclar_req ON public.fuel_clarification_requests(fuel_request_id, created_at);
ALTER TABLE public.fuel_clarification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fclar_select" ON public.fuel_clarification_requests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "fclar_insert" ON public.fuel_clarification_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "fclar_update" ON public.fuel_clarification_requests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ============= 4. Telebirr transaction audit log =============
CREATE TABLE IF NOT EXISTS public.fuel_telebirr_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  fuel_work_order_id uuid REFERENCES public.fuel_work_orders(id) ON DELETE CASCADE,
  fuel_request_id uuid REFERENCES public.fuel_requests(id) ON DELETE SET NULL,
  txn_type text NOT NULL,                     -- 'transfer'|'status'|'pullback'
  provider text NOT NULL DEFAULT 'stub',      -- 'real'|'stub'
  amount numeric,
  driver_phone text,
  request_payload jsonb,
  response_payload jsonb,
  external_ref text,
  status text NOT NULL DEFAULT 'pending',     -- 'pending'|'success'|'failed'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telebirr_wo ON public.fuel_telebirr_transactions(fuel_work_order_id, created_at DESC);
ALTER TABLE public.fuel_telebirr_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telebirr_select" ON public.fuel_telebirr_transactions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "telebirr_insert" ON public.fuel_telebirr_transactions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_fclar_updated ON public.fuel_clarification_requests;
CREATE TRIGGER trg_fclar_updated BEFORE UPDATE ON public.fuel_clarification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();