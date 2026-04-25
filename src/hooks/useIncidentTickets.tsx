import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

export interface IncidentTicket {
  id: string;
  organization_id: string;
  incident_id: string | null;
  ticket_number: string;
  ticket_type: string;
  priority: string;
  status: string;
  subject: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  related_claim_id: string | null;
  related_violation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useIncidentTickets = (filters?: {
  status?: string;
  priority?: string;
  ticketType?: string;
  assignedTo?: string;
}) => {
  const { organizationId } = useOrganization();
  const [tickets, setTickets] = useState<IncidentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!organizationId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("incident_tickets")
        .select("*")
        .eq("organization_id", organizationId);

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.ticketType && filters.ticketType !== "all") {
        query = query.eq("ticket_type", filters.ticketType);
      }
      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setTickets((data as IncidentTicket[]) || []);
    } catch (err: any) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [organizationId, filters?.status, filters?.priority, filters?.ticketType, filters?.assignedTo]);

  const createTicket = async (ticket: Partial<IncidentTicket>) => {
    if (!organizationId) return null;

    try {
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from("incident_tickets")
        .insert([{
          ticket_number: ticketNumber,
          organization_id: organizationId,
          incident_id: ticket.incident_id || null,
          ticket_type: ticket.ticket_type || "follow_up",
          priority: ticket.priority || "medium",
          status: "open",
          subject: ticket.subject || "",
          description: ticket.description || null,
          assigned_to_name: ticket.assigned_to_name || null,
          vehicle_id: ticket.vehicle_id || null,
          driver_id: ticket.driver_id || null,
          due_date: ticket.due_date || null,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Ticket created", description: `Ticket ${ticketNumber} has been created` });
      fetchTickets();
      return data;
    } catch (err: any) {
      friendlyToastError(err);
      return null;
    }
  };

  const updateTicketStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (notes) updateData.resolution_notes = notes;
      if (status === "resolved" || status === "closed") updateData.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from("incident_tickets")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Ticket updated", description: `Status changed to ${status}` });
      fetchTickets();
    } catch (err: any) {
      friendlyToastError(err);
    }
  };

  return {
    tickets,
    loading,
    createTicket,
    updateTicketStatus,
    refetch: fetchTickets,
  };
};
