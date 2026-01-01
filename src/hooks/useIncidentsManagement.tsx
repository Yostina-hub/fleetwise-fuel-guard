import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface Incident {
  id: string;
  organization_id: string;
  incident_number: string;
  incident_type: string;
  vehicle_id?: string;
  driver_id?: string;
  incident_time: string;
  location_name?: string;
  description: string;
  severity: string;
  status: string;
  resolution?: string;
  resolution_date?: string;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  reported_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  incident_id?: string;
  vehicle_id: string;
  claim_type: string;
  claim_amount?: number;
  deductible?: number;
  approved_amount?: number;
  status: string;
  insurance_company?: string;
  policy_number?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  filed_date?: string;
  approved_date?: string;
  paid_date?: string;
  payout_amount?: number;
  denial_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  organization_id: string;
  ticket_number: string;
  vehicle_id: string;
  driver_id?: string;
  violation_type: string;
  violation_date: string;
  location_name?: string;
  fine_amount: number;
  points_assessed?: number;
  paid_date?: string;
  paid_by?: string;
  payment_amount?: number;
  payment_method?: string;
  contested?: boolean;
  court_date?: string;
  court_outcome?: string;
  issuing_authority?: string;
  document_url?: string;
  notes?: string;
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
        .order("occurred_at", { ascending: false })
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
        .order("claim_date", { ascending: false })
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
          location_name: incident.location_name,
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
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      if (status === 'closed') updateData.resolution_date = new Date().toISOString();

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
          paid_date: new Date().toISOString(),
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
