
ALTER TABLE public.tire_requests
  ADD COLUMN IF NOT EXISTS workflow_instance_id UUID REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS iproc_mr_number TEXT,
  ADD COLUMN IF NOT EXISTS iproc_onhand_balance JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS iproc_old_tire_serials JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tire_requests_workflow_instance ON public.tire_requests(workflow_instance_id);

CREATE TABLE IF NOT EXISTS public.tire_utilization_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tire_id UUID REFERENCES public.tire_inventory(id) ON DELETE SET NULL,
  tire_request_id UUID REFERENCES public.tire_requests(id) ON DELETE SET NULL,
  position TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  km_at_install NUMERIC,
  km_at_removal NUMERIC,
  km_lifetime NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN km_at_removal IS NOT NULL AND km_at_install IS NOT NULL
      THEN GREATEST(km_at_removal - km_at_install, 0)
      ELSE NULL
    END
  ) STORED,
  cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tire_util_org ON public.tire_utilization_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_tire_util_vehicle ON public.tire_utilization_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tire_util_status ON public.tire_utilization_records(status);

ALTER TABLE public.tire_utilization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read tire utilization"
  ON public.tire_utilization_records FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members write tire utilization"
  ON public.tire_utilization_records FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members update tire utilization"
  ON public.tire_utilization_records FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Maintenance can delete tire utilization"
  ON public.tire_utilization_records FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
      OR public.has_role(auth.uid(), 'maintenance_lead'::app_role)
    )
  );

CREATE TRIGGER trg_tire_util_updated_at
  BEFORE UPDATE ON public.tire_utilization_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tire_request_check_iproc_returns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_pending INTEGER;
  v_workflow_instance_id UUID;
  v_current_stage TEXT;
BEGIN
  v_request_id := COALESCE(NEW.request_id, OLD.request_id);

  SELECT COUNT(*) INTO v_pending
  FROM public.tire_request_items
  WHERE request_id = v_request_id
    AND iproc_return_status = 'pending';

  SELECT workflow_instance_id INTO v_workflow_instance_id
  FROM public.tire_requests
  WHERE id = v_request_id;

  IF v_workflow_instance_id IS NOT NULL AND v_pending = 0 THEN
    SELECT current_stage INTO v_current_stage
    FROM public.workflow_instances
    WHERE id = v_workflow_instance_id;

    IF v_current_stage = 'iproc_return_check' THEN
      UPDATE public.workflow_instances
      SET current_stage = 'wo_preparation',
          current_lane = 'maintenance',
          updated_at = now()
      WHERE id = v_workflow_instance_id;

      INSERT INTO public.workflow_transitions (
        organization_id, instance_id, workflow_type,
        from_stage, to_stage, from_lane, to_lane,
        decision, notes, performed_by_name, performed_by_role, payload
      )
      SELECT organization_id, id, workflow_type,
             'iproc_return_check', 'wo_preparation', 'maintenance', 'maintenance',
             'auto_iproc_returned', 'All iPROC items returned — auto-advanced',
             'system', 'system', '{}'::jsonb
      FROM public.workflow_instances
      WHERE id = v_workflow_instance_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tire_request_iproc_check ON public.tire_request_items;
CREATE TRIGGER trg_tire_request_iproc_check
  AFTER UPDATE OF iproc_return_status ON public.tire_request_items
  FOR EACH ROW
  WHEN (NEW.iproc_return_status = 'returned' AND OLD.iproc_return_status IS DISTINCT FROM 'returned')
  EXECUTE FUNCTION public.tire_request_check_iproc_returns();
