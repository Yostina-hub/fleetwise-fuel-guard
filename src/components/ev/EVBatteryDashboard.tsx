import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Battery, BatteryWarning, Activity, ThermometerSun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export const EVBatteryDashboard = () => {
  const { organizationId } = useOrganization();

  const { data: evVehicles, isLoading } = useQuery({
    queryKey: ["ev-battery-health", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_vehicle_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("battery_health_percent", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getHealthColor = (health: number | null) => {
    if (!health) return "text-muted-foreground";
    if (health >= 80) return "text-green-500";
    if (health >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getHealthBadge = (health: number | null) => {
    if (!health) return { label: "Unknown", variant: "secondary" as const };
    if (health >= 80) return { label: "Good", variant: "default" as const };
    if (health >= 60) return { label: "Fair", variant: "secondary" as const };
    return { label: "Replace Soon", variant: "destructive" as const };
  };

  if (isLoading) {
    return <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Battery className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{evVehicles?.filter((v: any) => v.battery_health_percent >= 80).length || 0}</p>
              <p className="text-xs text-muted-foreground">Healthy Batteries (&gt;80%)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{evVehicles?.filter((v: any) => v.battery_health_percent >= 60 && v.battery_health_percent < 80).length || 0}</p>
              <p className="text-xs text-muted-foreground">Degrading (60-80%)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <BatteryWarning className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{evVehicles?.filter((v: any) => v.battery_health_percent !== null && v.battery_health_percent < 60).length || 0}</p>
              <p className="text-xs text-muted-foreground">Replace Soon (&lt;60%)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Battery Health Details</CardTitle>
        </CardHeader>
        <CardContent>
          {(!evVehicles || evVehicles.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <ThermometerSun className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No EV battery data available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evVehicles.map((ev: any) => {
                const health = ev.battery_health_percent;
                const badge = getHealthBadge(health);
                return (
                  <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{ev.vehicles?.plate_number || "N/A"}</p>
                        <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ev.battery_type || "Li-ion"} · {ev.battery_capacity_kwh || "--"} kWh · SoC: {ev.current_soc_percent ?? "--"}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-40">
                      <Progress value={health || 0} className="h-2" />
                      <span className={`text-sm font-bold min-w-[40px] text-right ${getHealthColor(health)}`}>
                        {health ?? "--"}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
