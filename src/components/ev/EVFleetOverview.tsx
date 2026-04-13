import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, BatteryCharging, BatteryWarning, Zap, TrendingUp, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Progress } from "@/components/ui/progress";

export const EVFleetOverview = () => {
  const { organizationId } = useOrganization();

  const { data: evVehicles, isLoading } = useQuery({
    queryKey: ["ev-vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_vehicle_data")
        .select("*, vehicles(plate_number, make, model, status)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: recentSessions } = useQuery({
    queryKey: ["ev-recent-sessions", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_charging_sessions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("start_time", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalEV = evVehicles?.length || 0;
  const charging = evVehicles?.filter((v: any) => v.current_soc_percent !== null && v.current_soc_percent < 20).length || 0;
  const healthy = evVehicles?.filter((v: any) => v.battery_health_percent && v.battery_health_percent > 80).length || 0;
  const avgSoC = totalEV > 0
    ? Math.round(evVehicles.reduce((s: number, v: any) => s + (v.current_soc_percent || 0), 0) / totalEV)
    : 0;

  const stats = [
    { label: "Total EV Fleet", value: totalEV, icon: Car, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Average SoC", value: `${avgSoC}%`, icon: Battery, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Low Battery", value: charging, icon: BatteryWarning, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Healthy Battery", value: healthy, icon: Zap, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-28" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Battery className="w-4 h-4" /> EV Vehicle Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalEV === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Battery className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No EV vehicles registered yet.</p>
                <p className="text-xs mt-1">Add EV data to vehicles to see them here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {evVehicles.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{ev.vehicles?.plate_number || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{ev.vehicles?.make} {ev.vehicles?.model}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{ev.current_soc_percent ?? "--"}%</p>
                        <p className="text-[10px] text-muted-foreground">{ev.estimated_range_km ?? "--"} km range</p>
                      </div>
                      <Progress
                        value={ev.current_soc_percent || 0}
                        className="w-16 h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BatteryCharging className="w-4 h-4" /> Recent Charging Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentSessions || recentSessions.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No charging sessions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{s.station_name || "Unknown Station"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{s.energy_consumed_kwh ?? "--"} kWh</p>
                      <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
