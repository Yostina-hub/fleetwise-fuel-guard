// SOP 1.8 — Per-vehicle tire utilization report.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CircleDot, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

interface VehicleStat {
  vehicle_id: string;
  plate: string;
  active: number;
  retired: number;
  total: number;
  avg_km_lifetime: number;
  avg_cost_per_km: number;
  total_cost: number;
}

export const TireUtilizationReport = () => {
  const { organizationId } = useOrganization();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tire-utilization", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tire_utilization_records" as any)
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId!)
        .order("installed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Aggregate per vehicle
  const byVehicle: Record<string, VehicleStat> = {};
  rows.forEach((r: any) => {
    const vid = r.vehicle_id;
    if (!byVehicle[vid]) {
      byVehicle[vid] = {
        vehicle_id: vid,
        plate: r.vehicles?.plate_number || "—",
        active: 0, retired: 0, total: 0,
        avg_km_lifetime: 0, avg_cost_per_km: 0, total_cost: 0,
      };
    }
    const v = byVehicle[vid];
    v.total += 1;
    if (r.status === "active") v.active += 1;
    else v.retired += 1;
    if (r.cost) v.total_cost += Number(r.cost);
    if (r.km_lifetime) v.avg_km_lifetime += Number(r.km_lifetime);
  });

  const stats = Object.values(byVehicle).map((v) => {
    const retiredCount = v.retired || 1;
    const avgKm = v.avg_km_lifetime / retiredCount;
    return {
      ...v,
      avg_km_lifetime: Math.round(avgKm),
      avg_cost_per_km: avgKm > 0 ? +(v.total_cost / (avgKm * retiredCount)).toFixed(3) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  const totalRecords = rows.length;
  const totalActive = rows.filter((r: any) => r.status === "active").length;
  const totalCost = rows.reduce((s: number, r: any) => s + (Number(r.cost) || 0), 0);
  const overallAvgKm = stats.length > 0
    ? Math.round(stats.reduce((s, v) => s + v.avg_km_lifetime, 0) / stats.length)
    : 0;

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading utilization data…</CardContent></Card>;
  }

  if (totalRecords === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No tire utilization records yet.</p>
        <p className="text-xs mt-1">Records are created automatically when tire requests are fulfilled (SOP 1.8).</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Tires Tracked</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center gap-2"><CircleDot className="w-5 h-5 text-primary" />{totalRecords}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Currently Active</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{totalActive}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Lifetime (km)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />{overallAvgKm.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Spend (ETB)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCost.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-Vehicle Tire Utilization</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stats.map((v) => {
            const ratio = totalRecords > 0 ? Math.min(100, Math.round((v.total / totalRecords) * 100)) : 0;
            return (
              <div key={v.vehicle_id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{v.plate}</span>
                    <Badge variant="outline">{v.total} tire{v.total !== 1 ? "s" : ""}</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{v.active} active</Badge>
                    {v.retired > 0 && <Badge variant="secondary">{v.retired} retired</Badge>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {v.total_cost > 0 && <div>{v.total_cost.toLocaleString()} ETB total</div>}
                    {v.avg_cost_per_km > 0 && <div>{v.avg_cost_per_km} ETB/km</div>}
                  </div>
                </div>
                <Progress value={ratio} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share of fleet tires: {ratio}%</span>
                  {v.avg_km_lifetime > 0 && (
                    <span className="flex items-center gap-1">
                      Avg lifetime: <strong>{v.avg_km_lifetime.toLocaleString()} km</strong>
                      {v.avg_km_lifetime < 30000 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
