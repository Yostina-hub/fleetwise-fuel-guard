
CREATE TABLE public.rental_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  plate_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  provider_name TEXT NOT NULL,
  contract_number TEXT,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  monthly_cost NUMERIC(12,2) DEFAULT 0,
  daily_rate NUMERIC(12,2),
  driver_name TEXT,
  driver_type TEXT DEFAULT 'own' CHECK (driver_type IN ('own', 'third_party', 'none')),
  driver_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'terminated')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_vehicles_select" ON public.rental_vehicles
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "rental_vehicles_insert" ON public.rental_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "rental_vehicles_update" ON public.rental_vehicles
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "rental_vehicles_delete" ON public.rental_vehicles
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_rental_vehicles_updated_at
  BEFORE UPDATE ON public.rental_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
