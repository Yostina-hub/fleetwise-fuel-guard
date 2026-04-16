import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface CapacityAlert {
  id: string;
  organization_id: string;
  alert_type: "vehicle_shortage" | "vehicle_overage" | "driver_shortage" | "driver_overage";
  severity: "low" | "medium" | "high" | "critical";
  zone_region: string | null;
  resource_count_current: number;
  resource_count_optimal: number;
  utilization_pct: number | null;
  message: string;
  recommendation: string | null;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  created_at: string;
}

export const useOutsourceCapacity = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["outsource-capacity", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("outsource_capacity_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as CapacityAlert[];
    },
    enabled: !!organizationId,
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("outsource_capacity_alerts").update({
        status: "acknowledged",
        acknowledged_by: u.user?.id,
        acknowledged_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-capacity"] });
      toast.success("Alert acknowledged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outsource_capacity_alerts").update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-capacity"] });
      toast.success("Alert resolved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Run capacity analysis: compute optimal vs current vehicle/driver counts
  const runAnalysis = useMutation({
    mutationFn: async (params: { utilizationLowPct?: number; utilizationHighPct?: number }) => {
      if (!organizationId) throw new Error("No org");
      const low = params.utilizationLowPct ?? 60;
      const high = params.utilizationHighPct ?? 90;

      // Pull vehicles and active trips (last 30 days)
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const [{ data: vehicles }, { data: trips }, { data: drivers }, { data: rentals }] = await Promise.all([
        supabase.from("vehicles").select("id,status").eq("organization_id", organizationId),
        supabase.from("trips").select("id,vehicle_id,driver_id,start_time").eq("organization_id", organizationId).gte("start_time", since),
        supabase.from("drivers").select("id,status").eq("organization_id", organizationId),
        supabase.from("rental_vehicles").select("id").eq("organization_id", organizationId).eq("status", "active"),
      ]);

      const totalVehicles = (vehicles?.length || 0) + (rentals?.length || 0);
      const totalDrivers = drivers?.length || 0;
      const activeVehicleSet = new Set((trips || []).map((t: any) => t.vehicle_id).filter(Boolean));
      const activeDriverSet = new Set((trips || []).map((t: any) => t.driver_id).filter(Boolean));
      const vehUtil = totalVehicles ? (activeVehicleSet.size / totalVehicles) * 100 : 0;
      const drvUtil = totalDrivers ? (activeDriverSet.size / totalDrivers) * 100 : 0;

      const inserts: any[] = [];
      if (vehUtil < low && totalVehicles > 0) {
        inserts.push({
          organization_id: organizationId,
          alert_type: "vehicle_overage",
          severity: vehUtil < low / 2 ? "high" : "medium",
          resource_count_current: totalVehicles,
          resource_count_optimal: Math.max(1, Math.round(activeVehicleSet.size / (low / 100))),
          utilization_pct: Number(vehUtil.toFixed(2)),
          message: `Vehicle utilisation is only ${vehUtil.toFixed(1)}% (below ${low}%).`,
          recommendation: "Consider reducing rental fleet or reassigning idle vehicles.",
        });
      }
      if (vehUtil > high) {
        inserts.push({
          organization_id: organizationId,
          alert_type: "vehicle_shortage",
          severity: vehUtil > 95 ? "critical" : "high",
          resource_count_current: totalVehicles,
          resource_count_optimal: Math.round(activeVehicleSet.size / (high / 100)),
          utilization_pct: Number(vehUtil.toFixed(2)),
          message: `Vehicle utilisation is ${vehUtil.toFixed(1)}% (above ${high}%).`,
          recommendation: "Engage outsource suppliers or rent additional vehicles.",
        });
      }
      if (drvUtil < low && totalDrivers > 0) {
        inserts.push({
          organization_id: organizationId,
          alert_type: "driver_overage",
          severity: "medium",
          resource_count_current: totalDrivers,
          resource_count_optimal: Math.max(1, Math.round(activeDriverSet.size / (low / 100))),
          utilization_pct: Number(drvUtil.toFixed(2)),
          message: `Driver utilisation is only ${drvUtil.toFixed(1)}% (below ${low}%).`,
          recommendation: "Reassign drivers or pause outsource driver contracts.",
        });
      }
      if (drvUtil > high) {
        inserts.push({
          organization_id: organizationId,
          alert_type: "driver_shortage",
          severity: drvUtil > 95 ? "critical" : "high",
          resource_count_current: totalDrivers,
          resource_count_optimal: Math.round(activeDriverSet.size / (high / 100)),
          utilization_pct: Number(drvUtil.toFixed(2)),
          message: `Driver utilisation is ${drvUtil.toFixed(1)}% (above ${high}%).`,
          recommendation: "Onboard outsource drivers via supplier agreements.",
        });
      }

      if (inserts.length) {
        const { error } = await supabase.from("outsource_capacity_alerts").insert(inserts);
        if (error) throw error;
      }
      return { generated: inserts.length, vehUtil, drvUtil };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["outsource-capacity"] });
      toast.success(`Analysis complete — ${r.generated} alert(s). Veh ${r.vehUtil.toFixed(0)}%, Drv ${r.drvUtil.toFixed(0)}%`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { alerts, isLoading, acknowledge, resolve, runAnalysis };
};
