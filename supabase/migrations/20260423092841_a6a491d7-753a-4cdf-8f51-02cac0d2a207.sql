
CREATE TABLE IF NOT EXISTS public.cross_pool_borrow_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_request_id UUID REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  source_pool TEXT NOT NULL,
  target_pool TEXT NOT NULL,
  requested_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  requested_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  requested_by UUID,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  responded_by UUID,
  response_notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpbr_org ON public.cross_pool_borrow_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpbr_target ON public.cross_pool_borrow_requests(target_pool);
CREATE INDEX IF NOT EXISTS idx_cpbr_status ON public.cross_pool_borrow_requests(status);
CREATE INDEX IF NOT EXISTS idx_cpbr_request ON public.cross_pool_borrow_requests(vehicle_request_id);

ALTER TABLE public.cross_pool_borrow_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cpbr_is_same_org(_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.organization_id = _org
  );
$$;

CREATE POLICY "cpbr_select_same_org"
ON public.cross_pool_borrow_requests
FOR SELECT TO authenticated
USING (public.cpbr_is_same_org(organization_id));

CREATE POLICY "cpbr_insert_operators"
ON public.cross_pool_borrow_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.cpbr_is_same_org(organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
    OR public.has_role(auth.uid(), 'dispatcher'::app_role)
    OR public.has_role(auth.uid(), 'operator'::app_role)
  )
);

CREATE POLICY "cpbr_update_operators"
ON public.cross_pool_borrow_requests
FOR UPDATE TO authenticated
USING (
  public.cpbr_is_same_org(organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations_manager'::app_role)
    OR public.has_role(auth.uid(), 'dispatcher'::app_role)
    OR public.has_role(auth.uid(), 'operator'::app_role)
  )
);

DROP TRIGGER IF EXISTS trg_cpbr_updated_at ON public.cross_pool_borrow_requests;
CREATE TRIGGER trg_cpbr_updated_at
BEFORE UPDATE ON public.cross_pool_borrow_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
