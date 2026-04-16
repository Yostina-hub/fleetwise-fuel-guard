import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  request_number: string;
  request_type: string;
  trigger_source: string;
  km_reading: number | null;
  running_hours: number | null;
  fuel_level: number | null;
  priority: string;
  status: string;
  requestor_department: string | null;
  description: string | null;
  rejection_reason: string | null;
  notes: string | null;
  work_order_id: string | null;
  schedule_id: string | null;
  approved_at: string | null;
  requested_completion_date: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: { plate_number: string; make: string; model: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

export const useMaintenanceRequests = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["maintenance-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model), driver:drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaintenanceRequest[];
    },
    enabled: !!organizationId,
  });

  const createRequest = useMutation({
    mutationFn: async (payload: {
      vehicle_id: string;
      driver_id?: string;
      request_type: string;
      trigger_source?: string;
      km_reading?: number;
      running_hours?: number;
      fuel_level?: number;
      priority: string;
      requestor_department?: string;
      description?: string;
      requested_completion_date?: string;
      notes?: string;
      schedule_id?: string;
    }) => {
      if (!organizationId) throw new Error("No organization");
      const reqNumber = "MR-" + Date.now().toString().slice(-8);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("maintenance_requests").insert({
        organization_id: organizationId,
        request_number: reqNumber,
        requested_by: userData.user?.id,
        status: "submitted",
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast.success("Maintenance request created successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status: "approved",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Request approved — Work order auto-created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status: "rejected",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast.success("Request rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = {
    total: requests.length,
    draft: requests.filter(r => r.status === "draft").length,
    submitted: requests.filter(r => r.status === "submitted").length,
    approved: requests.filter(r => r.status === "approved" || r.status === "work_order_created").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
  };

  return { requests, isLoading, createRequest, approveRequest, rejectRequest, stats };
};
