import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type PRStatus =
  | "draft" | "submitted" | "fuel_info_pending" | "consolidating"
  | "info_required" | "pending_approval" | "approved" | "contract_check"
  | "validated" | "rejected" | "paid" | "cancelled";

export interface OutsourcePaymentRequest {
  id: string;
  organization_id: string;
  request_number: string;
  contract_id: string | null;
  rental_vehicle_id: string | null;
  driver_id: string | null;
  supplier_id: string | null;
  period_start: string;
  period_end: string;
  amount_requested: number;
  amount_approved: number | null;
  fuel_cost: number;
  lubricant_cost: number;
  deductions: number;
  currency: string;
  status: PRStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  fuel_info_provided_by: string | null;
  fuel_info_provided_at: string | null;
  consolidated_by: string | null;
  consolidated_at: string | null;
  current_approval_step: number | null;
  total_approval_steps: number | null;
  approver_id: string | null;
  approved_at: string | null;
  contract_check_by: string | null;
  contract_check_at: string | null;
  contract_check_result: "valid" | "invalid" | "needs_info" | null;
  rejection_reason: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export const useOutsourcePaymentRequests = (filters?: { status?: PRStatus }) => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["outsource-payment-requests", organizationId, filters?.status],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase
        .from("outsource_payment_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OutsourcePaymentRequest[];
    },
    enabled: !!organizationId,
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<OutsourcePaymentRequest> & {
      period_start: string; period_end: string; amount_requested: number;
    }) => {
      if (!organizationId) throw new Error("No org");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("outsource_payment_requests").insert({
        organization_id: organizationId,
        submitted_by: u.user?.id,
        submitted_at: new Date().toISOString(),
        status: "submitted",
        ...payload,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-payment-requests"] });
      toast.success("Payment request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transition = useMutation({
    mutationFn: async (args: { id: string; status: PRStatus; patch?: Partial<OutsourcePaymentRequest> }) => {
      const { data: u } = await supabase.auth.getUser();
      const update: any = { status: args.status, ...args.patch };
      const now = new Date().toISOString();
      if (args.status === "consolidating" || args.status === "pending_approval") update.consolidated_at = now, update.consolidated_by = u.user?.id;
      if (args.status === "approved") update.approved_at = now, update.approver_id = u.user?.id;
      if (args.status === "validated") update.contract_check_at = now, update.contract_check_by = u.user?.id;
      if (args.status === "paid") update.paid_at = now;
      if (args.status === "fuel_info_pending") {} // no special stamp until provided
      const { error } = await supabase.from("outsource_payment_requests").update(update).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-payment-requests"] });
      toast.success("Workflow updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const provideFuelInfo = useMutation({
    mutationFn: async (args: { id: string; fuel_cost: number; lubricant_cost: number; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("outsource_payment_requests").update({
        fuel_cost: args.fuel_cost,
        lubricant_cost: args.lubricant_cost,
        fuel_info_provided_by: u.user?.id,
        fuel_info_provided_at: new Date().toISOString(),
        status: "consolidating",
        notes: args.notes,
      }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-payment-requests"] });
      toast.success("Fuel & lubricant info provided");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { requests, isLoading, create, transition, provideFuelInfo };
};
