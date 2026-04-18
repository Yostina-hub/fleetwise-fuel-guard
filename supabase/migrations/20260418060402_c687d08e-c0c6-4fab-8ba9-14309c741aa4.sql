-- 1) Widen the scope CHECK constraint to cover the FMG SOP workflows.
ALTER TABLE public.authority_matrix DROP CONSTRAINT IF EXISTS authority_matrix_scope_check;
ALTER TABLE public.authority_matrix
  ADD CONSTRAINT authority_matrix_scope_check
  CHECK (scope = ANY (ARRAY[
    'vehicle_request','fuel_request','work_order','trip','maintenance','outsource_payment',
    'fleet_inspection','inspection',
    'fleet_transfer','vehicle_transfer','transfer',
    'vehicle_handover','handover',
    'vehicle_dispatch','dispatch',
    'driver_allowance','allowance',
    'outsource_rental','rental','outsource',
    'tire_request'
  ]::text[]));

-- 2) Seed default delegation rules for every organization (idempotent).
DO $$
DECLARE org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.authority_matrix
      (organization_id, scope, rule_name, approver_role, step_order, priority, is_active)
    SELECT org.id, 'fleet_transfer', 'Fleet Transfer — Operations approval (2a)',
      'fleet_manager', 1, 100, true
    WHERE NOT EXISTS (SELECT 1 FROM public.authority_matrix
       WHERE organization_id = org.id AND scope = 'fleet_transfer'
         AND step_order = 1 AND approver_role = 'fleet_manager');

    INSERT INTO public.authority_matrix
      (organization_id, scope, rule_name, approver_role, step_order, priority, is_active)
    SELECT org.id, 'fleet_transfer', 'Fleet Transfer — Safety/QA plan approval (2b)',
      'operations_manager', 2, 100, true
    WHERE NOT EXISTS (SELECT 1 FROM public.authority_matrix
       WHERE organization_id = org.id AND scope = 'fleet_transfer'
         AND step_order = 2 AND approver_role = 'operations_manager');

    INSERT INTO public.authority_matrix
      (organization_id, scope, rule_name, approver_role, step_order, priority, is_active)
    SELECT org.id, 'fleet_inspection', 'Fleet Inspection — first approver',
      'fleet_manager', 1, 100, true
    WHERE NOT EXISTS (SELECT 1 FROM public.authority_matrix
       WHERE organization_id = org.id AND scope = 'fleet_inspection'
         AND step_order = 1 AND approver_role = 'fleet_manager');
  END LOOP;
END $$;