ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS workflow_instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_workflow_instance_id
  ON public.vehicle_inspections(workflow_instance_id);