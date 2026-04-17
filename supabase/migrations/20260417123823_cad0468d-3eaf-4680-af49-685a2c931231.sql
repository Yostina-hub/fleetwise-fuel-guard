
-- 1) inspection_settings
CREATE TABLE IF NOT EXISTS public.inspection_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  annual_lead_days integer[] NOT NULL DEFAULT ARRAY[60,30,7,1],
  pretrip_required_for_dispatch boolean NOT NULL DEFAULT true,
  posttrip_auto_create boolean NOT NULL DEFAULT true,
  email_recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
ALTER TABLE public.inspection_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_settings_org_read"
  ON public.inspection_settings FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "inspection_settings_org_write"
  ON public.inspection_settings FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(),'org_admin'::public.app_role)
      OR public.has_role(auth.uid(),'fleet_manager'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role))
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(),'org_admin'::public.app_role)
      OR public.has_role(auth.uid(),'fleet_manager'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role))
  );

CREATE TRIGGER inspection_settings_set_updated_at
BEFORE UPDATE ON public.inspection_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) inspection_due_dates
CREATE TABLE IF NOT EXISTS public.inspection_due_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspection_type text NOT NULL CHECK (inspection_type IN ('annual','pre_trip','post_trip')),
  next_due_date date,
  source text CHECK (source IN ('registration_anniversary','last_inspection_plus_12m','manual')),
  last_inspection_id uuid REFERENCES public.vehicle_inspections(id) ON DELETE SET NULL,
  last_status text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, inspection_type)
);
CREATE INDEX IF NOT EXISTS idx_inspection_due_dates_org_due
  ON public.inspection_due_dates (organization_id, next_due_date);

ALTER TABLE public.inspection_due_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_due_dates_org_read"
  ON public.inspection_due_dates FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "inspection_due_dates_org_write"
  ON public.inspection_due_dates FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(),'org_admin'::public.app_role)
      OR public.has_role(auth.uid(),'fleet_manager'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role))
  )
  WITH CHECK (
    organization_id = public.get_user_organization(auth.uid())
    AND (public.has_role(auth.uid(),'org_admin'::public.app_role)
      OR public.has_role(auth.uid(),'fleet_manager'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role))
  );

-- 3) inspection_reminder_log
CREATE TABLE IF NOT EXISTS public.inspection_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspection_type text NOT NULL,
  due_date date NOT NULL,
  lead_bucket integer NOT NULL,
  channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  fired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, inspection_type, due_date, lead_bucket)
);
ALTER TABLE public.inspection_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_reminder_log_org_read"
  ON public.inspection_reminder_log FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- 4) compute_annual_inspection_due
CREATE OR REPLACE FUNCTION public.compute_annual_inspection_due(_vehicle_id uuid)
RETURNS TABLE(next_due date, source text, last_inspection_id uuid, last_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reg_expiry date;
  v_last_id uuid;
  v_last_date date;
  v_last_status text;
  v_reg_based date;
  v_insp_based date;
BEGIN
  SELECT registration_expiry::date INTO v_reg_expiry
    FROM public.vehicles WHERE id = _vehicle_id;

  SELECT id, inspection_date::date, status
    INTO v_last_id, v_last_date, v_last_status
    FROM public.vehicle_inspections
   WHERE vehicle_id = _vehicle_id
     AND inspection_type = 'annual'
     AND status IN ('passed','completed')
   ORDER BY inspection_date DESC
   LIMIT 1;

  IF v_reg_expiry IS NOT NULL THEN v_reg_based := v_reg_expiry - INTERVAL '30 days'; END IF;
  IF v_last_date IS NOT NULL THEN v_insp_based := v_last_date + INTERVAL '12 months'; END IF;

  IF v_reg_based IS NOT NULL AND v_insp_based IS NOT NULL THEN
    IF v_reg_based <= v_insp_based THEN
      RETURN QUERY SELECT v_reg_based, 'registration_anniversary'::text, v_last_id, v_last_status;
    ELSE
      RETURN QUERY SELECT v_insp_based, 'last_inspection_plus_12m'::text, v_last_id, v_last_status;
    END IF;
  ELSIF v_reg_based IS NOT NULL THEN
    RETURN QUERY SELECT v_reg_based, 'registration_anniversary'::text, v_last_id, v_last_status;
  ELSIF v_insp_based IS NOT NULL THEN
    RETURN QUERY SELECT v_insp_based, 'last_inspection_plus_12m'::text, v_last_id, v_last_status;
  ELSE
    RETURN QUERY SELECT NULL::date, NULL::text, NULL::uuid, NULL::text;
  END IF;
END;
$$;

-- 5) refresh helper
CREATE OR REPLACE FUNCTION public.refresh_inspection_due_for_vehicle(_vehicle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_due date; v_src text; v_last_id uuid; v_last_status text;
BEGIN
  SELECT organization_id INTO v_org FROM public.vehicles WHERE id = _vehicle_id;
  IF v_org IS NULL THEN RETURN; END IF;

  SELECT next_due, source, last_inspection_id, last_status
    INTO v_due, v_src, v_last_id, v_last_status
    FROM public.compute_annual_inspection_due(_vehicle_id);

  INSERT INTO public.inspection_due_dates (
    organization_id, vehicle_id, inspection_type,
    next_due_date, source, last_inspection_id, last_status, updated_at
  ) VALUES (
    v_org, _vehicle_id, 'annual', v_due, COALESCE(v_src,'manual'), v_last_id, v_last_status, now()
  )
  ON CONFLICT (vehicle_id, inspection_type) DO UPDATE SET
    next_due_date      = EXCLUDED.next_due_date,
    source             = EXCLUDED.source,
    last_inspection_id = EXCLUDED.last_inspection_id,
    last_status        = EXCLUDED.last_status,
    updated_at         = now();
END;
$$;

-- 6) triggers
CREATE OR REPLACE FUNCTION public.trg_vehicle_reg_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.registration_expiry IS DISTINCT FROM OLD.registration_expiry THEN
    PERFORM public.refresh_inspection_due_for_vehicle(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS vehicles_refresh_inspection_due ON public.vehicles;
CREATE TRIGGER vehicles_refresh_inspection_due
AFTER INSERT OR UPDATE OF registration_expiry ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.trg_vehicle_reg_changed();

CREATE OR REPLACE FUNCTION public.trg_inspection_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.inspection_type = 'annual' THEN
    PERFORM public.refresh_inspection_due_for_vehicle(NEW.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS vehicle_inspections_refresh_due ON public.vehicle_inspections;
CREATE TRIGGER vehicle_inspections_refresh_due
AFTER INSERT OR UPDATE ON public.vehicle_inspections
FOR EACH ROW EXECUTE FUNCTION public.trg_inspection_changed();

-- 7) backfill
INSERT INTO public.inspection_settings (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.vehicles LOOP
    PERFORM public.refresh_inspection_due_for_vehicle(r.id);
  END LOOP;
END $$;

-- 8) realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_due_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_settings;
