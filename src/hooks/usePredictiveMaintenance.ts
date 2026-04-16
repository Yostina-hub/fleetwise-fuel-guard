import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PredictiveScore {
  id: string;
  organization_id: string;
  vehicle_id: string;
  health_score: number;
  risk_level: RiskLevel;
  predicted_failure_component: string | null;
  predicted_failure_window_days: number | null;
  contributing_factors: {
    mileage_km?: number;
    vehicle_age_years?: number;
    overdue_schedules?: number;
    recent_high_alerts_30d?: number;
  };
  recommended_action: string | null;
  recommended_priority: string | null;
  status: "open" | "dismissed" | "actioned";
  work_order_id: string | null;
  computed_at: string;
  vehicles?: { plate_number: string; make: string | null; model: string | null; year: number | null; current_mileage_km: number | null };
}

export const usePredictiveMaintenance = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["predictive-maintenance", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("predictive_maintenance_scores")
        .select("*, vehicles(plate_number, make, model, year, current_mileage_km)")
        .eq("organization_id", organizationId)
        .order("health_score", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PredictiveScore[];
    },
    enabled: !!organizationId,
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase.rpc("compute_predictive_scores", { p_org_id: organizationId });
      if (error) throw error;
      return (data?.[0] ?? { processed: 0, critical: 0, high: 0 }) as { processed: number; critical: number; high: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["predictive-maintenance"] });
      toast.success(`Analyzed ${r.processed} vehicles — ${r.critical} critical, ${r.high} high`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("predictive_maintenance_scores").update({
        status: "dismissed",
        dismissed_by: u.user?.id,
        dismissed_at: new Date().toISOString(),
        dismiss_reason: reason ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictive-maintenance"] });
      toast.success("Prediction dismissed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createWorkOrder = useMutation({
    mutationFn: async (p: PredictiveScore) => {
      if (!organizationId) throw new Error("No org");
      const wo_number = `PM-WO-${Date.now().toString(36).toUpperCase()}`;
      const { data: wo, error } = await supabase.from("work_orders").insert({
        organization_id: organizationId,
        vehicle_id: p.vehicle_id,
        work_order_number: wo_number,
        work_type: "predictive",
        priority: p.recommended_priority || "medium",
        service_description: `[AI Predictive] ${p.predicted_failure_component ?? "General inspection"} — ${p.recommended_action ?? ""}`,
        service_category: "predictive_maintenance",
        scheduled_date: new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10),
        status: "pending",
        request_type: "predictive",
      } as any).select().single();
      if (error) throw error;

      await supabase.from("predictive_maintenance_scores").update({
        status: "actioned",
        work_order_id: wo.id,
      }).eq("id", p.id);
      return wo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictive-maintenance"] });
      toast.success("Work order created from prediction");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { predictions, isLoading, runAnalysis, dismiss, createWorkOrder };
};
