CREATE TABLE IF NOT EXISTS public.vehicle_handover_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'accessory'
    CHECK (category IN ('safety', 'comfort', 'accessory', 'other')),
  default_qty INTEGER NOT NULL DEFAULT 1 CHECK (default_qty >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vhci_org_active
  ON public.vehicle_handover_catalog_items (organization_id, is_active, sort_order);

ALTER TABLE public.vehicle_handover_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vhci_view_same_org"
  ON public.vehicle_handover_catalog_items
  FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "vhci_insert_managers"
  ON public.vehicle_handover_catalog_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    )
  );

CREATE POLICY "vhci_update_managers"
  ON public.vehicle_handover_catalog_items
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    )
  );

CREATE POLICY "vhci_delete_managers"
  ON public.vehicle_handover_catalog_items
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'fleet_owner'::app_role)
      OR public.has_role(auth.uid(), 'operations_manager'::app_role)
      OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
    )
  );

CREATE OR REPLACE FUNCTION public.tg_vhci_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vhci_updated_at ON public.vehicle_handover_catalog_items;
CREATE TRIGGER trg_vhci_updated_at
  BEFORE UPDATE ON public.vehicle_handover_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_vhci_updated_at();

DO $$
DECLARE
  org RECORD;
  defaults JSONB := '[
    {"name":"Jack","category":"safety","sort_order":1},
    {"name":"Wheel spanner","category":"safety","sort_order":2},
    {"name":"Spare tire","category":"safety","sort_order":3},
    {"name":"Fire extinguisher","category":"safety","sort_order":4},
    {"name":"First-aid kit","category":"safety","sort_order":5},
    {"name":"Warning triangle","category":"safety","sort_order":6},
    {"name":"Reflective vest","category":"safety","sort_order":7},
    {"name":"Tow rope","category":"safety","sort_order":8},
    {"name":"Jumper cables","category":"safety","sort_order":9},
    {"name":"Tire inflator","category":"safety","sort_order":10},
    {"name":"Floor mats","category":"comfort","sort_order":11},
    {"name":"Seat covers","category":"comfort","sort_order":12},
    {"name":"Headrests","category":"comfort","sort_order":13},
    {"name":"Sun visor","category":"comfort","sort_order":14},
    {"name":"A/C remote","category":"comfort","sort_order":15},
    {"name":"Radio / antenna","category":"comfort","sort_order":16},
    {"name":"USB charger","category":"comfort","sort_order":17},
    {"name":"Spare keys","category":"accessory","sort_order":18},
    {"name":"Tool kit","category":"accessory","sort_order":19},
    {"name":"Owner manual","category":"accessory","sort_order":20},
    {"name":"Service booklet","category":"accessory","sort_order":21},
    {"name":"Registration card (Bolo)","category":"accessory","sort_order":22},
    {"name":"Insurance certificate","category":"accessory","sort_order":23},
    {"name":"Mud flaps","category":"accessory","sort_order":24},
    {"name":"Cargo net / tarpaulin","category":"accessory","sort_order":25},
    {"name":"Wheel chocks","category":"accessory","sort_order":26},
    {"name":"Roof rack","category":"accessory","sort_order":27},
    {"name":"GPS tracker","category":"accessory","sort_order":28},
    {"name":"Dash cam","category":"accessory","sort_order":29},
    {"name":"Vehicle log book","category":"other","sort_order":30}
  ]'::JSONB;
  item JSONB;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    FOR item IN SELECT * FROM jsonb_array_elements(defaults) LOOP
      INSERT INTO public.vehicle_handover_catalog_items
        (organization_id, name, category, sort_order)
      VALUES
        (org.id,
         item->>'name',
         item->>'category',
         (item->>'sort_order')::INT)
      ON CONFLICT (organization_id, name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;