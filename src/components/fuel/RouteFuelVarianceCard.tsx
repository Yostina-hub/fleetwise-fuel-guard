import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Route as RouteIcon, ChevronDown, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Trip = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  distance_km: number | null;
  fuel_consumed_liters: number | null;
  fuel_efficiency_kmpl: number | null;
  start_location: any;
  end_location: any;
  start_time: string;
};

type DriverRow = { id: string; first_name: string; last_name: string };

const locName = (loc: any): string => {
  if (!loc) return "Unknown";
  if (typeof loc === "string") return loc;
  return loc.name || loc.address || loc.label || "Unknown";
};

const routeKey = (t: Trip) => `${locName(t.start_location)} → ${locName(t.end_location)}`;

interface RouteAggregate {
  routeKey: string;
  tripCount: number;
  totalDistance: number;
  totalFuel: number;
  actualLper100: number;
  specLper100: number | null;
  historicalLper100: number | null;
  variancePct: number | null;
  driverBreakdown: Array<{
    driverId: string | null;
    driverName: string;
    tripCount: number;
    avgLper100: number;
    variancePct: number | null;
  }>;
}

const RouteFuelVarianceCard = () => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const [openRoute, setOpenRoute] = useState<string | null>(null);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["route-fuel-trips", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("trips")
        .select("id, vehicle_id, driver_id, distance_km, fuel_consumed_liters, fuel_efficiency_kmpl, start_location, end_location, start_time")
        .eq("organization_id", organizationId)
        .gte("start_time", since.toISOString())
        .not("fuel_consumed_liters", "is", null)
        .not("distance_km", "is", null)
        .gt("distance_km", 0);
      if (error) throw error;
      return (data || []) as Trip[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-min", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return (data || []) as DriverRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });

  const driverName = (id: string | null) => {
    if (!id) return "Unassigned";
    const d = drivers.find((x) => x.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown";
  };

  const vehicleSpecLper100 = (vehicleId: string): number | null => {
    const v = vehicles.find((x) => x.id === vehicleId);
    const kmpl = (v as any)?.fuel_standard_km_per_liter;
    if (!kmpl || kmpl <= 0) return null;
    return 100 / kmpl;
  };

  const aggregates: RouteAggregate[] = useMemo(() => {
    const grouped = new Map<string, Trip[]>();
    for (const t of trips) {
      const key = routeKey(t);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    const rows: RouteAggregate[] = [];
    grouped.forEach((routeTrips, key) => {
      if (routeTrips.length < 2) return; // require at least 2 trips for meaningful comparison
      const totalDistance = routeTrips.reduce((s, t) => s + Number(t.distance_km || 0), 0);
      const totalFuel = routeTrips.reduce((s, t) => s + Number(t.fuel_consumed_liters || 0), 0);
      if (totalDistance <= 0 || totalFuel <= 0) return;

      const actualLper100 = (totalFuel / totalDistance) * 100;

      // Spec baseline: weighted by per-vehicle distance
      let specWeighted = 0;
      let specDistance = 0;
      for (const t of routeTrips) {
        const spec = vehicleSpecLper100(t.vehicle_id);
        if (spec != null) {
          specWeighted += spec * Number(t.distance_km || 0);
          specDistance += Number(t.distance_km || 0);
        }
      }
      const specLper100 = specDistance > 0 ? specWeighted / specDistance : null;

      // Historical baseline = same actual (rolling 30d already). Use median trip-level L/100 as baseline.
      const tripLper100 = routeTrips
        .map((t) => (Number(t.fuel_consumed_liters) / Number(t.distance_km)) * 100)
        .sort((a, b) => a - b);
      const historicalLper100 = tripLper100[Math.floor(tripLper100.length / 2)] ?? null;

      const baseline = specLper100 ?? historicalLper100;
      const variancePct = baseline ? ((actualLper100 - baseline) / baseline) * 100 : null;

      // Driver breakdown
      const byDriver = new Map<string | null, Trip[]>();
      for (const t of routeTrips) {
        const k = t.driver_id;
        if (!byDriver.has(k)) byDriver.set(k, []);
        byDriver.get(k)!.push(t);
      }
      const driverBreakdown = Array.from(byDriver.entries()).map(([driverId, dTrips]) => {
        const dDist = dTrips.reduce((s, t) => s + Number(t.distance_km || 0), 0);
        const dFuel = dTrips.reduce((s, t) => s + Number(t.fuel_consumed_liters || 0), 0);
        const avgLper100 = dDist > 0 ? (dFuel / dDist) * 100 : 0;
        const dVar = baseline ? ((avgLper100 - baseline) / baseline) * 100 : null;
        return {
          driverId,
          driverName: driverName(driverId),
          tripCount: dTrips.length,
          avgLper100,
          variancePct: dVar,
        };
      }).sort((a, b) => (b.variancePct ?? 0) - (a.variancePct ?? 0));

      rows.push({
        routeKey: key,
        tripCount: routeTrips.length,
        totalDistance,
        totalFuel,
        actualLper100,
        specLper100,
        historicalLper100,
        variancePct,
        driverBreakdown,
      });
    });

    return rows.sort((a, b) => (b.variancePct ?? -Infinity) - (a.variancePct ?? -Infinity)).slice(0, 10);
  }, [trips, vehicles, drivers]);

  const renderVariance = (pct: number | null) => {
    if (pct == null) return <span className="text-muted-foreground">—</span>;
    const Icon = pct > 2 ? TrendingUp : pct < -2 ? TrendingDown : Minus;
    const color = pct > 10 ? "text-destructive" : pct > 2 ? "text-warning" : pct < -2 ? "text-success" : "text-muted-foreground";
    const sign = pct > 0 ? "+" : "";
    return (
      <span className={cn("inline-flex items-center gap-1 font-medium", color)}>
        <Icon className="w-3.5 h-3.5" />
        {sign}{pct.toFixed(1)}%
      </span>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RouteIcon className="w-5 h-5 text-primary" />
            Per-Route Fuel Variance
          </CardTitle>
          <Badge variant="outline">Last 30 days</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Actual L/100km vs vehicle spec and historical median. Click a route for driver-level coaching drilldown.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading routes…
          </div>
        ) : aggregates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No routes with sufficient data yet. Need ≥2 completed trips with fuel & distance per route.
          </div>
        ) : (
          aggregates.map((agg) => (
            <Collapsible
              key={agg.routeKey}
              open={openRoute === agg.routeKey}
              onOpenChange={(o) => setOpenRoute(o ? agg.routeKey : null)}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{agg.routeKey}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {agg.tripCount} trips · {agg.totalDistance.toFixed(0)} km · {agg.actualLper100.toFixed(1)} L/100km
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-3 text-xs">
                    <div className="text-right">
                      <div className="text-muted-foreground">vs Spec</div>
                      <div>{renderVariance(agg.specLper100 ? ((agg.actualLper100 - agg.specLper100) / agg.specLper100) * 100 : null)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">vs Hist</div>
                      <div>{renderVariance(agg.historicalLper100 ? ((agg.actualLper100 - agg.historicalLper100) / agg.historicalLper100) * 100 : null)}</div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", openRoute === agg.routeKey && "rotate-180")} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-3 mr-3 mb-2 border-l-2 border-primary/30 pl-3 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Driver Drilldown</div>
                  {agg.driverBreakdown.map((d) => (
                    <div key={d.driverId ?? "none"} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate">{d.driverName}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{d.tripCount} trips</span>
                        <span className="font-mono">{d.avgLper100.toFixed(1)} L/100km</span>
                        {renderVariance(d.variancePct)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RouteFuelVarianceCard;
