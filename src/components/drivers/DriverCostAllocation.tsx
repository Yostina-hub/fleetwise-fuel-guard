import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DollarSign, TrendingUp, Fuel, Wrench, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { type Employee, EMPLOYEE_TYPE_LABELS, EMPLOYEE_TYPE_COLORS } from "@/hooks/useEmployees";

interface CostAllocation {
  id: string;
  driver_id: string;
  employee_id: string | null;
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
  employeeId?: string;
  employees?: Employee[];
}

export const DriverCostAllocation = ({ driverId, driverName, employeeId, employees = [] }: DriverCostAllocationProps) => {
  const { organizationId } = useOrganization();
  const [costs, setCosts] = useState<CostAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isAllMode = !employeeId && !driverId;

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("driver_cost_allocations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("period_start", { ascending: false })
        .limit(isAllMode ? 200 : 12);

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data } = await query;
      setCosts((data as CostAllocation[]) || []);
      setLoading(false);
    };
    fetch();
  }, [driverId, employeeId, organizationId]);

  const getEmpName = (c: CostAllocation) => {
    if (!isAllMode) return driverName;
    const emp = employees.find(e => e.id === c.employee_id || e.driver_id === c.driver_id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
  };

  const filtered = useMemo(() => {
    if (!search) return costs;
    const q = search.toLowerCase();
    return costs.filter(c => getEmpName(c).toLowerCase().includes(q));
  }, [costs, search, employees]);

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

      {/* Search bar for all mode */}
      {isAllMode && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by employee name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cost History{!isAllMode && ` — ${driverName}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No cost data found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const empType = employees.find(e => e.id === c.employee_id || e.driver_id === c.driver_id)?.employee_type || "other";
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <DollarSign className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      {isAllMode && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold">{getEmpName(c)}</span>
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${EMPLOYEE_TYPE_COLORS[empType]}`}>
                            {EMPLOYEE_TYPE_LABELS[empType]}
                          </Badge>
                        </div>
                      )}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
