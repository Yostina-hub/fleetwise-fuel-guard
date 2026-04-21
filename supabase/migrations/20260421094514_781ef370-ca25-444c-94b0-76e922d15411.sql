CREATE TABLE public.vehicle_request_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_request_id UUID NOT NULL REFERENCES public.vehicle_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT vrs_seq_positive CHECK (sequence >= 1),
  CONSTRAINT vrs_lat_bounds CHECK (lat IS NULL OR (lat BETWEEN -90 AND 90)),
  CONSTRAINT vrs_lng_bounds CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180)),
  CONSTRAINT vrs_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  UNIQUE (vehicle_request_id, sequence)
);

CREATE INDEX idx_vrstops_request ON public.vehicle_request_stops(vehicle_request_id, sequence);
CREATE INDEX idx_vrstops_org ON public.vehicle_request_stops(organization_id);

ALTER TABLE public.vehicle_request_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view request stops"
ON public.vehicle_request_stops FOR SELECT TO authenticated
USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can insert request stops"
ON public.vehicle_request_stops FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_id AND vr.organization_id = vehicle_request_stops.organization_id
  )
);

CREATE POLICY "Requester or admin can update stops"
ON public.vehicle_request_stops FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_id
      AND (
        (vr.requester_id = auth.uid() AND vr.status = 'pending')
        OR public.has_role(auth.uid(), 'org_admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      )
  )
);

CREATE POLICY "Requester or admin can delete stops"
ON public.vehicle_request_stops FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicle_requests vr
    WHERE vr.id = vehicle_request_id
      AND (
        (vr.requester_id = auth.uid() AND vr.status = 'pending')
        OR public.has_role(auth.uid(), 'org_admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_role(auth.uid(), 'fleet_manager'::app_role)
      )
  )
);

CREATE TRIGGER update_vehicle_request_stops_updated_at
BEFORE UPDATE ON public.vehicle_request_stops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();