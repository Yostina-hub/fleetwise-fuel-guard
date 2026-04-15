
-- Add fault_party and assigned_to columns to incidents
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS fault_party TEXT DEFAULT 'own',
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Create incident_tickets table for internal follow-up
CREATE TABLE public.incident_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'follow_up',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  related_claim_id UUID,
  related_violation_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "incident_tickets_select" ON public.incident_tickets
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "incident_tickets_insert" ON public.incident_tickets
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "incident_tickets_update" ON public.incident_tickets
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "incident_tickets_delete" ON public.incident_tickets
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- Indexes
CREATE INDEX idx_incident_tickets_org ON public.incident_tickets(organization_id);
CREATE INDEX idx_incident_tickets_incident ON public.incident_tickets(incident_id);
CREATE INDEX idx_incident_tickets_status ON public.incident_tickets(status);
CREATE INDEX idx_incident_tickets_assigned ON public.incident_tickets(assigned_to);

-- Updated_at trigger
CREATE TRIGGER update_incident_tickets_updated_at
  BEFORE UPDATE ON public.incident_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rate limit trigger
CREATE TRIGGER rate_limit_incident_tickets_inserts
  BEFORE INSERT ON public.incident_tickets
  FOR EACH ROW EXECUTE FUNCTION public.check_insert_rate_limit();

-- Add fault_party to accident_claims if not exists
ALTER TABLE public.accident_claims 
ADD COLUMN IF NOT EXISTS fault_party TEXT DEFAULT 'own';
