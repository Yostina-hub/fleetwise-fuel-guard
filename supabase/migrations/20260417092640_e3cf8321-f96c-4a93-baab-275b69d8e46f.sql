
ALTER TABLE public.authority_matrix DROP CONSTRAINT IF EXISTS authority_matrix_scope_check;
ALTER TABLE public.authority_matrix
  ADD CONSTRAINT authority_matrix_scope_check
  CHECK (scope = ANY (ARRAY['vehicle_request','fuel_request','work_order','trip','maintenance','outsource_payment']));
