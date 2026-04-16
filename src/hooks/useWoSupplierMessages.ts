import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useEffect } from "react";

export interface WoSupplierMessage {
  id: string;
  work_order_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export const useWoSupplierMessages = (workOrderId: string | null) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["wo-supplier-messages", workOrderId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return [];
      const { data, error } = await supabase
        .from("wo_supplier_messages")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as WoSupplierMessage[];
    },
    enabled: !!organizationId && !!workOrderId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!workOrderId) return;
    const channel = supabase
      .channel(`wo-messages-${workOrderId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wo_supplier_messages",
        filter: `work_order_id=eq.${workOrderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["wo-supplier-messages", workOrderId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workOrderId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (payload: {
      sender_type: string;
      sender_name: string;
      message: string;
      attachment_url?: string;
      attachment_name?: string;
    }) => {
      if (!organizationId || !workOrderId) throw new Error("Missing data");
      const { error } = await supabase.from("wo_supplier_messages").insert({
        organization_id: organizationId,
        work_order_id: workOrderId,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wo-supplier-messages", workOrderId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { messages, isLoading, sendMessage };
};
