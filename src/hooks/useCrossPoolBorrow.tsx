/**
 * useCrossPoolBorrow
 * ------------------
 * Hooks to read and create cross-pool vehicle borrow requests so a pool
 * supervisor can ask another pool to lend an idle vehicle when their own
 * pool can't satisfy a pending vehicle request.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrossPoolBorrowRequest {
  id: string;
  organization_id: string;
  vehicle_request_id: string | null;
  source_pool: string;
  target_pool: string;
  requested_vehicle_id: string | null;
  requested_driver_id: string | null;
  requested_by: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  responded_by: string | null;
  response_notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useCrossPoolBorrowRequests = (organizationId?: string) => {
  return useQuery({
    queryKey: ["cross-pool-borrow", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cross_pool_borrow_requests")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as CrossPoolBorrowRequest[];
    },
    refetchInterval: 30000,
  });
};

interface CreateBorrowInput {
  organization_id: string;
  source_pool: string;
  target_pool: string;
  requested_vehicle_id?: string | null;
  requested_driver_id?: string | null;
  vehicle_request_id?: string | null;
  reason?: string;
}

export const useCreateBorrowRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBorrowInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("cross_pool_borrow_requests")
        .insert({
          organization_id: input.organization_id,
          source_pool: input.source_pool,
          target_pool: input.target_pool,
          requested_vehicle_id: input.requested_vehicle_id || null,
          requested_driver_id: input.requested_driver_id || null,
          vehicle_request_id: input.vehicle_request_id || null,
          reason: input.reason || null,
          requested_by: userRes?.user?.id || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data as CrossPoolBorrowRequest;
    },
    onSuccess: (row) => {
      toast.success(`Borrow request sent to ${row.target_pool}`);
      qc.invalidateQueries({ queryKey: ["cross-pool-borrow", row.organization_id] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send borrow request"),
  });
};

export const useRespondBorrowRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      organization_id: string;
      status: "approved" | "rejected" | "cancelled";
      response_notes?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("cross_pool_borrow_requests")
        .update({
          status: input.status,
          response_notes: input.response_notes || null,
          responded_by: userRes?.user?.id || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Borrow request ${vars.status}`);
      qc.invalidateQueries({ queryKey: ["cross-pool-borrow", vars.organization_id] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update borrow request"),
  });
};
