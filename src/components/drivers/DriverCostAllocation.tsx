import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DollarSign, TrendingUp, Fuel, Wrench } from "lucide-react";
import { format } from "date-fns";

interface CostAllocation {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  fuel_cost: number;
  maintenance_cost: number;
  toll_cost: number;
  fine_cost: number;
  insurance_cost: number;
  other_cost: number;
  total_cost: number;
  cost_per_km: number | null;
}

interface DriverCostAllocationProps {
  driverId: string;
  driverName: string;
}

export const DriverCostAllocation = ({ driverId, driverName }: DriverCostAllocationProps) => {
  const { organizationId } = useOrganization();
  const [costs, setCosts] = useState<CostAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_cost_allocations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .order("period_start", { ascending: false })
        .limit(12);
      setCosts((data as CostAllocation[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const totalAllTime = costs.reduce((s, c) => s + (c.total_cost || 0), 0);
  const avgMonthly = costs.length > 0 ? totalAllTime / costs.length : 0;
  const totalFuel = costs.reduce((s, c) => s + (c.fuel_cost || 0), 0);
  const totalMaint = costs.reduce((s, c) => s + (c.maintenance_cost || 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{fmt(totalAllTime)}</p>
          <p className="text-[10px] text-muted-foreground">Total Cost</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{fmt(avgMonthly)}</p>
          <p className="text-[10px] text-muted-foreground">Avg/Period</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Fuel className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold">{fmt(totalFuel)}</p>
          <p className="text-[10px] text-muted-foreground">Fuel Cost</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Wrench className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{fmt(totalMaint)}</p>
          <p className="text-[10px] text-muted-foreground">Maintenance</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cost History — {driverName}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : costs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No cost data for {driverName}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {costs.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(c.period_start), "MMM yyyy")} — {format(new Date(c.period_end), "MMM yyyy")}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {c.fuel_cost > 0 && <span className="text-[10px] text-muted-foreground">Fuel: {fmt(c.fuel_cost)}</span>}
                      {c.maintenance_cost > 0 && <span className="text-[10px] text-muted-foreground">Maint: {fmt(c.maintenance_cost)}</span>}
                      {c.toll_cost > 0 && <span className="text-[10px] text-muted-foreground">Tolls: {fmt(c.toll_cost)}</span>}
                      {c.fine_cost > 0 && <span className="text-[10px] text-muted-foreground">Fines: {fmt(c.fine_cost)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{fmt(c.total_cost)}</p>
                    {c.cost_per_km && <p className="text-[10px] text-muted-foreground">{c.cost_per_km.toFixed(2)}/km</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
