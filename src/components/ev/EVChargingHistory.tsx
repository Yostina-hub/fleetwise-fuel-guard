import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

export const EVChargingHistory = () => {
  const { organizationId } = useOrganization();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["ev-charging-sessions", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_charging_sessions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("start_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalEnergy = sessions?.reduce((s: number, r: any) => s + (r.energy_consumed_kwh || 0), 0) || 0;
  const totalCost = sessions?.reduce((s: number, r: any) => s + (r.total_cost || 0), 0) || 0;
  const avgDuration = sessions?.length
    ? Math.round(
        sessions.reduce((s: number, r: any) => {
          if (!r.start_time || !r.end_time) return s;
          return s + (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000;
        }, 0) / sessions.length
      )
    : 0;

  if (isLoading) return <Card className="animate-pulse h-48" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEnergy.toFixed(1)} kWh</p>
              <p className="text-xs text-muted-foreground">Total Energy Consumed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCost.toFixed(2)} ETB</p>
              <p className="text-xs text-muted-foreground">Total Charging Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgDuration} min</p>
              <p className="text-xs text-muted-foreground">Avg Session Duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Charging Session Log</CardTitle>
        </CardHeader>
        <CardContent>
          {(!sessions || sessions.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No charging sessions recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Station</th>
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-right py-2 px-3">Energy (kWh)</th>
                    <th className="text-right py-2 px-3">SoC</th>
                    <th className="text-right py-2 px-3">Cost</th>
                    <th className="text-center py-2 px-3">Type</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{s.station_name || "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {format(new Date(s.start_time), "MMM dd, HH:mm")}
                      </td>
                      <td className="py-2 px-3 text-right">{s.energy_consumed_kwh ?? "—"}</td>
                      <td className="py-2 px-3 text-right">
                        {s.soc_start_percent ?? "—"}% → {s.soc_end_percent ?? "—"}%
                      </td>
                      <td className="py-2 px-3 text-right">{s.total_cost ? `${s.total_cost} ETB` : "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="outline" className="text-[10px]">{s.charging_type?.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
