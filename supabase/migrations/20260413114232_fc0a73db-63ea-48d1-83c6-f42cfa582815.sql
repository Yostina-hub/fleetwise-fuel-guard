
-- Passenger tracking for bus/shuttle fleets
CREATE TABLE public.passenger_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  trip_id UUID REFERENCES public.trips(id),
  route_name TEXT,
  departure_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrival_time TIMESTAMPTZ,
  total_passengers INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  driver_id UUID REFERENCES public.drivers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.passenger_boardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES public.passenger_manifests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  passenger_name TEXT,
  passenger_phone TEXT,
  boarding_stop TEXT,
  alighting_stop TEXT,
  boarding_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  alighting_time TIMESTAMPTZ,
  fare_amount NUMERIC(10,2),
  fare_paid BOOLEAN DEFAULT false,
  ticket_number TEXT,
  seat_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rfid_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  device_id UUID NOT NULL REFERENCES public.devices(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  rfid_tag TEXT NOT NULL,
  paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unpaired_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  paired_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fuel_card_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  provider_name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_interval_minutes INTEGER DEFAULT 60,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.passenger_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_boardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_card_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org passenger manifests" ON public.passenger_manifests
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org passenger boardings" ON public.passenger_boardings
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org rfid pairings" ON public.rfid_pairings
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org fuel card providers" ON public.fuel_card_providers
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_passenger_manifests_updated_at BEFORE UPDATE ON public.passenger_manifests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfid_pairings_updated_at BEFORE UPDATE ON public.rfid_pairings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_card_providers_updated_at BEFORE UPDATE ON public.fuel_card_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
