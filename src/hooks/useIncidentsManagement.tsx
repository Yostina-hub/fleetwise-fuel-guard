import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface Incident {
  id: string;
  organization_id: string;
  incident_number: string;
  incident_type: string;
  vehicle_id?: string | null;
  driver_id?: string | null;
  incident_time: string;
  location?: string | null;
  description: string;
  severity: string;
  status: string;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  incident_id?: string | null;
  vehicle_id: string;
  claim_type: string;
  claim_amount?: number | null;
  deductible?: number | null;
  approved_amount?: number | null;
  settlement_amount?: number | null;
  settlement_date?: string | null;
  status: string;
  insurance_provider?: string | null;
  policy_number?: string | null;
  adjuster_name?: string | null;
  adjuster_phone?: string | null;
  adjuster_email?: string | null;
  filed_date?: string | null;
  notes?: string | null;
  document_urls?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  organization_id: string;
  ticket_number?: string | null;
  vehicle_id: string;
  driver_id?: string | null;
  violation_type: string;
  violation_date: string;
  location_name?: string | null;
  fine_amount?: number | null;
  points_assigned?: number | null;
  payment_date?: string | null;
  payment_status?: string | null;
  paid_by?: string | null;
  issuing_authority?: string | null;
  document_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const useIncidentsManagement = (filters?: {
  status?: string;
  severity?: string;
  vehicleId?: string;
}) => {
  const { organizationId } = useOrganization();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    if (!organizationId) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("incidents")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq("severity", filters.severity);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      const { data, error } = await query
        .order("incident_time", { ascending: false })
        .limit(100);

      if (error) throw error;
      setIncidents((data as Incident[]) || []);
    } catch (err: any) {
      console.error("Error fetching incidents:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select("*")
        .eq("organization_id", organizationId)
        .order("filed_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setClaims((data as InsuranceClaim[]) || []);
    } catch (err: any) {
      console.error("Error fetching claims:", err);
    }
  };

  const fetchViolations = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("traffic_violations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("violation_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setViolations((data as TrafficViolation[]) || []);
    } catch (err: any) {
      console.error("Error fetching violations:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchClaims();
    fetchViolations();
  }, [organizationId, filters?.status, filters?.severity, filters?.vehicleId]);

  const createIncident = async (incident: Partial<Incident>) => {
    if (!organizationId) return null;

    try {
      const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from("incidents")
        .insert([{
          incident_number: incidentNumber,
          incident_type: incident.incident_type || 'accident',
          incident_time: incident.incident_time || new Date().toISOString(),
          description: incident.description || '',
          severity: incident.severity || 'medium',
          status: incident.status || 'reported',
          vehicle_id: incident.vehicle_id,
          driver_id: incident.driver_id,
          location: incident.location,
          organization_id: organizationId,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Incident reported", description: "Incident has been logged" });
      fetchIncidents();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateIncidentStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (notes) updateData.resolution_notes = notes;
      if (status === 'resolved' || status === 'closed') updateData.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from("incidents")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Status updated", description: `Incident marked as ${status}` });
      fetchIncidents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const createClaim = async (claim: Partial<InsuranceClaim>) => {
    if (!organizationId) return null;

    try {
      const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from("insurance_claims")
        .insert([{
          claim_number: claimNumber,
          claim_type: claim.claim_type || 'damage',
          vehicle_id: claim.vehicle_id,
          status: claim.status || 'pending',
          organization_id: organizationId,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Claim created", description: "Insurance claim submitted" });
      fetchClaims();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const recordViolationPayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("traffic_violations")
        .update({
          payment_date: new Date().toISOString(),
          payment_status: 'paid',
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Payment recorded", description: "Violation marked as paid" });
      fetchViolations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return {
    incidents,
    claims,
    violations,
    loading,
    error,
    createIncident,
    updateIncidentStatus,
    createClaim,
    recordViolationPayment,
    refetch: fetchIncidents,
  };
};
