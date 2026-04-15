import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Zap, Calendar, Gauge } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import EnergyCostRatesManager from "@/components/energy/EnergyCostRatesManager";

export const EVCostAnalysis = () => {
  const { organizationId } = useOrganization();

  const { data: sessions } = useQuery({
    queryKey: ["ev-cost-analysis", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_charging_sessions")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("status", "completed");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalCost = sessions?.reduce((s: number, r: any) => s + (r.total_cost || 0), 0) || 0;
  const totalEnergy = sessions?.reduce((s: number, r: any) => s + (r.energy_consumed_kwh || 0), 0) || 0;
  const avgCostPerKwh = totalEnergy > 0 ? (totalCost / totalEnergy) : 0;
  const totalSessions = sessions?.length || 0;

  // Group by month
  const monthlyData: Record<string, { cost: number; energy: number; sessions: number }> = {};
  sessions?.forEach((s: any) => {
    const month = new Date(s.start_time).toLocaleDateString("en", { year: "numeric", month: "short" });
    if (!monthlyData[month]) monthlyData[month] = { cost: 0, energy: 0, sessions: 0 };
    monthlyData[month].cost += s.total_cost || 0;
    monthlyData[month].energy += s.energy_consumed_kwh || 0;
    monthlyData[month].sessions += 1;
  });

  const months = Object.entries(monthlyData).slice(-6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalCost.toFixed(0)} ETB</p>
              <p className="text-xs text-muted-foreground">Total Spending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalEnergy.toFixed(1)} kWh</p>
              <p className="text-xs text-muted-foreground">Total Energy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{avgCostPerKwh.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Avg ETB/kWh</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No cost data available yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3">Month</th>
                    <th className="text-right py-2 px-3">Sessions</th>
                    <th className="text-right py-2 px-3">Energy (kWh)</th>
                    <th className="text-right py-2 px-3">Cost (ETB)</th>
                    <th className="text-right py-2 px-3">Avg ETB/kWh</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(([month, data]) => (
                    <tr key={month} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{month}</td>
                      <td className="py-2 px-3 text-right">{data.sessions}</td>
                      <td className="py-2 px-3 text-right">{data.energy.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{data.cost.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">
                        {data.energy > 0 ? (data.cost / data.energy).toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic EV Charging Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Configurable Charging Cost Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyCostRatesManager filterType="ev_charging" />
        </CardContent>
      </Card>
    </div>
  );
};
