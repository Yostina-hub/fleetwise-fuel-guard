import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentApprovalStep {
  id: string;
  payment_request_id: string;
  step_order: number;
  approver_role: string;
  rule_name: string | null;
  status: "pending" | "approved" | "rejected" | "skipped";
  acted_by: string | null;
  acted_at: string | null;
  comments: string | null;
}

export const useOutsourcePaymentApprovals = (paymentRequestId?: string | null) => {
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["outsource-payment-approvals", paymentRequestId],
    queryFn: async () => {
      if (!paymentRequestId) return [];
      const { data, error } = await (supabase as any)
        .from("outsource_payment_approvals")
        .select("*")
        .eq("payment_request_id", paymentRequestId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentApprovalStep[];
    },
    enabled: !!paymentRequestId,
  });

  return { steps, isLoading };
};
