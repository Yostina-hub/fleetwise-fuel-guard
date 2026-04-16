// Clarification loop hook (steps 14-17 of the Telebirr fuel workflow).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FuelClarificationRequest {
  id: string;
  fuel_request_id: string;
  question: string;
  justification: string | null;
  status: string;
  resolution: string | null;
  requested_by: string | null;
  justified_by: string | null;
  resolved_by: string | null;
  created_at: string;
  justified_at: string | null;
  resolved_at: string | null;
}

export const useFuelClarifications = (fuelRequestId: string | null) => {
  const qc = useQueryClient();

  const { data: clarifications = [], isLoading } = useQuery({
    queryKey: ["fuel-clarifications", fuelRequestId],
    queryFn: async () => {
      if (!fuelRequestId) return [];
      const { data, error } = await (supabase as any)
        .from("fuel_clarification_requests")
        .select("*")
        .eq("fuel_request_id", fuelRequestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FuelClarificationRequest[];
    },
    enabled: !!fuelRequestId,
  });

  const requestClarification = useMutation({
    mutationFn: async (payload: { question: string; organization_id: string }) => {
      if (!fuelRequestId) throw new Error("No fuel request");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("fuel_clarification_requests").insert({
        fuel_request_id: fuelRequestId,
        organization_id: payload.organization_id,
        question: payload.question,
        requested_by: u.user?.id,
      });
      if (error) throw error;
      // Mark fuel request as needing clarification
      await (supabase as any).from("fuel_requests").update({ clarification_status: "requested" }).eq("id", fuelRequestId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-clarifications"] });
      qc.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("Clarification requested from fuel admin");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitJustification = useMutation({
    mutationFn: async ({ id, justification }: { id: string; justification: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("fuel_clarification_requests").update({
        justification, justified_by: u.user?.id, justified_at: new Date().toISOString(), status: "answered",
      }).eq("id", id);
      if (error) throw error;
      if (fuelRequestId) {
        await (supabase as any).from("fuel_requests").update({ clarification_status: "justified" }).eq("id", fuelRequestId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-clarifications"] });
      qc.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("Justification submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveClarification = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: "approved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("fuel_clarification_requests").update({
        status: "closed", resolution, resolved_by: u.user?.id, resolved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      if (fuelRequestId) {
        await (supabase as any).from("fuel_requests").update({
          clarification_status: resolution,
          clearance_status: resolution === "approved" ? "cleared" : "deviation_detected",
          clearance_approved_by: u.user?.id,
          clearance_approved_at: resolution === "approved" ? new Date().toISOString() : null,
        }).eq("id", fuelRequestId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-clarifications"] });
      qc.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("Clearance decision recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { clarifications, isLoading, requestClarification, submitJustification, resolveClarification };
};
