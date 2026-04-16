import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface SupplierPaymentRequest {
  id: string;
  work_order_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  amount: number;
  currency: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  work_order?: { work_order_number: string; status: string } | null;
}

export const useSupplierPayments = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["supplier-payments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("supplier_payment_requests")
        .select("*, work_order:work_orders(work_order_number, status)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SupplierPaymentRequest[];
    },
    enabled: !!organizationId,
  });

  const submitPayment = useMutation({
    mutationFn: async (payload: {
      work_order_id: string;
      supplier_name: string;
      invoice_number?: string;
      invoice_url?: string;
      amount: number;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error("No organization");
      const { error } = await supabase.from("supplier_payment_requests").insert({
        organization_id: organizationId,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      toast.success("Payment request submitted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewPayment = useMutation({
    mutationFn: async ({ id, action, reason, paymentRef }: {
      id: string; action: "approved" | "rejected"; reason?: string; paymentRef?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("supplier_payment_requests")
        .update({
          status: action,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: action === "rejected" ? reason : null,
          payment_reference: paymentRef || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      toast.success("Payment review submitted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { payments, isLoading, submitPayment, reviewPayment };
};
