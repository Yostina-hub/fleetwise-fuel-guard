-- Fleet Assets Master Registry
CREATE TABLE public.fleet_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment',
  sub_category TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  current_value NUMERIC(12,2),
  depreciation_method TEXT DEFAULT 'straight_line',
  depreciation_rate NUMERIC(5,2),
  salvage_value NUMERIC(12,2) DEFAULT 0,
  useful_life_years NUMERIC(4,1),
  lifecycle_stage TEXT NOT NULL DEFAULT 'acquired',
  assigned_to_user UUID,
  assigned_to_depot UUID REFERENCES public.depots(id) ON DELETE SET NULL,
  location TEXT,
  condition TEXT DEFAULT 'new',
  warranty_expiry DATE,
  notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, asset_code)
);

ALTER TABLE public.fleet_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org assets" ON public.fleet_assets FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create org assets" ON public.fleet_assets FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update org assets" ON public.fleet_assets FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete org assets" ON public.fleet_assets FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_fleet_assets_updated_at BEFORE UPDATE ON public.fleet_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asset Lifecycle Events
CREATE TABLE public.asset_lifecycle_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.fleet_assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'acquired',
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_stage TEXT,
  to_stage TEXT,
  performed_by TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  documents TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org lifecycle" ON public.asset_lifecycle_events FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create org lifecycle" ON public.asset_lifecycle_events FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update org lifecycle" ON public.asset_lifecycle_events FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete org lifecycle" ON public.asset_lifecycle_events FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Asset Inventory (for consumable/stockable items)
CREATE TABLE public.asset_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.fleet_assets(id) ON DELETE CASCADE,
  stock_location TEXT,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'pcs',
  last_counted_at TIMESTAMPTZ,
  last_restocked_at TIMESTAMPTZ,
  supplier TEXT,
  unit_cost NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, asset_id, stock_location)
);

ALTER TABLE public.asset_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org inventory" ON public.asset_inventory FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create org inventory" ON public.asset_inventory FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update org inventory" ON public.asset_inventory FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete org inventory" ON public.asset_inventory FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_asset_inventory_updated_at BEFORE UPDATE ON public.asset_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asset Cost Records
CREATE TABLE public.asset_cost_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.fleet_assets(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  maintenance_schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_cost_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org costs" ON public.asset_cost_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create org costs" ON public.asset_cost_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update org costs" ON public.asset_cost_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete org costs" ON public.asset_cost_records FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_asset_cost_records_updated_at BEFORE UPDATE ON public.asset_cost_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_fleet_assets_org ON public.fleet_assets(organization_id);
CREATE INDEX idx_fleet_assets_category ON public.fleet_assets(category);
CREATE INDEX idx_fleet_assets_stage ON public.fleet_assets(lifecycle_stage);
CREATE INDEX idx_fleet_assets_vehicle ON public.fleet_assets(vehicle_id);
CREATE INDEX idx_asset_lifecycle_asset ON public.asset_lifecycle_events(asset_id);
CREATE INDEX idx_asset_inventory_asset ON public.asset_inventory(asset_id);
CREATE INDEX idx_asset_cost_asset ON public.asset_cost_records(asset_id);
CREATE INDEX idx_asset_cost_type ON public.asset_cost_records(cost_type);