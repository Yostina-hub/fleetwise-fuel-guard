
-- 1. Consent Records table (Art. 7)
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('gps_tracking', 'data_processing', 'communications', 'data_sharing', 'biometric', 'video_recording')),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  consent_text TEXT,
  given_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  ip_address TEXT,
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert consent records"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can update consent records"
  ON public.consent_records FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_consent_records_org ON public.consent_records(organization_id);
CREATE INDEX idx_consent_records_driver ON public.consent_records(driver_id);

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Breach Incidents table (Art. 33)
CREATE TABLE public.breach_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  breach_type TEXT NOT NULL DEFAULT 'unauthorized_access' CHECK (breach_type IN ('unauthorized_access', 'data_loss', 'data_theft', 'system_compromise', 'accidental_disclosure', 'other')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurred_at TIMESTAMPTZ,
  notification_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  authority_notified_at TIMESTAMPTZ,
  subjects_notified_at TIMESTAMPTZ,
  affected_records_count INTEGER DEFAULT 0,
  affected_data_types TEXT[] DEFAULT '{}',
  root_cause TEXT,
  containment_actions TEXT,
  remediation_actions TEXT,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'contained', 'resolved', 'reported')),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dpo_notified BOOLEAN DEFAULT false,
  risk_to_rights TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.breach_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view breach incidents"
  ON public.breach_incidents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert breach incidents"
  ON public.breach_incidents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can update breach incidents"
  ON public.breach_incidents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_breach_incidents_org ON public.breach_incidents(organization_id);

CREATE TRIGGER update_breach_incidents_updated_at
  BEFORE UPDATE ON public.breach_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Processing Activities Register (Art. 30 - ROPA)
CREATE TABLE public.processing_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  lawful_basis TEXT NOT NULL CHECK (lawful_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interest', 'public_interest', 'legitimate_interest')),
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  data_subjects TEXT[] NOT NULL DEFAULT '{}',
  recipients TEXT[] DEFAULT '{}',
  third_country_transfers TEXT,
  retention_period TEXT,
  security_measures TEXT,
  dpia_required BOOLEAN DEFAULT false,
  dpia_completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  responsible_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view processing activities"
  ON public.processing_activities FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert processing activities"
  ON public.processing_activities FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can update processing activities"
  ON public.processing_activities FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_processing_activities_org ON public.processing_activities(organization_id);

CREATE TRIGGER update_processing_activities_updated_at
  BEFORE UPDATE ON public.processing_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add processing_restricted flag to drivers (Art. 18)
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS processing_restricted BOOLEAN DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS processing_restricted_at TIMESTAMPTZ;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS processing_restricted_reason TEXT;
