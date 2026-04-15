
-- 1. Driver Attendance
CREATE TABLE IF NOT EXISTS public.driver_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_trip', 'override')),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  shift_type TEXT DEFAULT 'morning' CHECK (shift_type IN ('morning', 'afternoon', 'night', 'split')),
  total_hours NUMERIC(5,2) DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  notes TEXT,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, date, source)
);

ALTER TABLE public.driver_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_driver_attendance" ON public.driver_attendance FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_driver_attendance" ON public.driver_attendance FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_driver_attendance" ON public.driver_attendance FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_driver_attendance" ON public.driver_attendance FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_driver_attendance_updated_at BEFORE UPDATE ON public.driver_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_driver_attendance_driver_date ON public.driver_attendance(driver_id, date);

-- 2. Driver Leave Requests
CREATE TABLE IF NOT EXISTS public.driver_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'emergency', 'maternity', 'paternity')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_driver_leave" ON public.driver_leave_requests FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_driver_leave" ON public.driver_leave_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_driver_leave" ON public.driver_leave_requests FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_driver_leave" ON public.driver_leave_requests FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_driver_leave_updated_at BEFORE UPDATE ON public.driver_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Driver Performance KPIs
CREATE TABLE IF NOT EXISTS public.driver_performance_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  trips_completed INTEGER DEFAULT 0,
  total_km NUMERIC(10,2) DEFAULT 0,
  on_time_percentage NUMERIC(5,2) DEFAULT 0,
  fuel_efficiency_score NUMERIC(5,2) DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  attendance_rate NUMERIC(5,2) DEFAULT 0,
  composite_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, period)
);

ALTER TABLE public.driver_performance_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_perf_kpis" ON public.driver_performance_kpis FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_perf_kpis" ON public.driver_performance_kpis FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_perf_kpis" ON public.driver_performance_kpis FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_perf_kpis_updated_at BEFORE UPDATE ON public.driver_performance_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Driver Payroll
CREATE TABLE IF NOT EXISTS public.driver_payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary NUMERIC(12,2) DEFAULT 0,
  trip_bonus NUMERIC(12,2) DEFAULT 0,
  km_bonus NUMERIC(12,2) DEFAULT 0,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  other_earnings NUMERIC(12,2) DEFAULT 0,
  deductions JSONB DEFAULT '{}',
  total_deductions NUMERIC(12,2) DEFAULT 0,
  gross_pay NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, pay_period_start, pay_period_end)
);

ALTER TABLE public.driver_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_payroll" ON public.driver_payroll FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_payroll" ON public.driver_payroll FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_payroll" ON public.driver_payroll FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_payroll" ON public.driver_payroll FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.driver_payroll
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Driver Payroll Config
CREATE TABLE IF NOT EXISTS public.driver_payroll_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  base_monthly_salary NUMERIC(12,2) DEFAULT 0,
  per_trip_rate NUMERIC(10,2) DEFAULT 0,
  per_km_rate NUMERIC(10,4) DEFAULT 0,
  overtime_hourly_rate NUMERIC(10,2) DEFAULT 0,
  weekend_multiplier NUMERIC(4,2) DEFAULT 1.5,
  night_shift_multiplier NUMERIC(4,2) DEFAULT 1.25,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_payroll_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_payroll_config" ON public.driver_payroll_config FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_payroll_config" ON public.driver_payroll_config FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_payroll_config" ON public.driver_payroll_config FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_payroll_config_updated_at BEFORE UPDATE ON public.driver_payroll_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Outsource Contracts
CREATE TABLE IF NOT EXISTS public.outsource_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  contractor_contact TEXT,
  contractor_email TEXT,
  contract_type TEXT NOT NULL DEFAULT 'driver_outsource' CHECK (contract_type IN ('driver_outsource', 'vehicle_lease', 'full_service', 'maintenance_outsource')),
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  monthly_cost NUMERIC(12,2) DEFAULT 0,
  total_contract_value NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  vehicles_included JSONB DEFAULT '[]',
  drivers_included JSONB DEFAULT '[]',
  payment_terms TEXT,
  sla_terms TEXT,
  penalty_terms TEXT,
  performance_metrics JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'terminated', 'pending', 'suspended')),
  documents TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outsource_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_outsource" ON public.outsource_contracts FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_outsource" ON public.outsource_contracts FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_outsource" ON public.outsource_contracts FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_outsource" ON public.outsource_contracts FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_outsource_updated_at BEFORE UPDATE ON public.outsource_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Outsource Payments
CREATE TABLE IF NOT EXISTS public.outsource_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.outsource_contracts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'ETB',
  payment_method TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outsource_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_outsource_pay" ON public.outsource_payments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_insert_outsource_pay" ON public.outsource_payments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_update_outsource_pay" ON public.outsource_payments FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_delete_outsource_pay" ON public.outsource_payments FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_outsource_pay_updated_at BEFORE UPDATE ON public.outsource_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-populate attendance from completed trips
CREATE OR REPLACE FUNCTION public.auto_attendance_from_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.driver_id IS NOT NULL AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.driver_attendance (
      organization_id, driver_id, date, check_in_time, check_out_time,
      source, trip_id, total_hours, status
    ) VALUES (
      NEW.organization_id,
      NEW.driver_id,
      COALESCE(NEW.start_time, now())::date,
      NEW.start_time,
      COALESCE(NEW.end_time, now()),
      'auto_trip',
      NEW.id,
      EXTRACT(EPOCH FROM (COALESCE(NEW.end_time, now()) - COALESCE(NEW.start_time, now()))) / 3600.0,
      'present'
    )
    ON CONFLICT (driver_id, date, source) DO UPDATE SET
      check_out_time = GREATEST(driver_attendance.check_out_time, EXCLUDED.check_out_time),
      total_hours = driver_attendance.total_hours + EXCLUDED.total_hours,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_attendance_on_trip_complete
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.auto_attendance_from_trip();
