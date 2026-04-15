
-- Idempotent: add policies/indexes/triggers if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_cost_rates' AND policyname = 'Users can view own org energy rates') THEN
    CREATE POLICY "Users can view own org energy rates"
      ON public.energy_cost_rates FOR SELECT TO authenticated
      USING (organization_id = public.get_user_organization(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_cost_rates' AND policyname = 'Users can insert own org energy rates') THEN
    CREATE POLICY "Users can insert own org energy rates"
      ON public.energy_cost_rates FOR INSERT TO authenticated
      WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_cost_rates' AND policyname = 'Users can update own org energy rates') THEN
    CREATE POLICY "Users can update own org energy rates"
      ON public.energy_cost_rates FOR UPDATE TO authenticated
      USING (organization_id = public.get_user_organization(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_cost_rates' AND policyname = 'Users can delete own org energy rates') THEN
    CREATE POLICY "Users can delete own org energy rates"
      ON public.energy_cost_rates FOR DELETE TO authenticated
      USING (organization_id = public.get_user_organization(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_energy_cost_rates_lookup 
  ON public.energy_cost_rates (organization_id, energy_type, fuel_type, effective_from DESC);
