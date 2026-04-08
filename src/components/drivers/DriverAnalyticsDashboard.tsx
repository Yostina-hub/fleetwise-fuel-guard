import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { BarChart3, Users, MapPin, Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface DriverStats {
  id: string;
  first_name: string;
  last_name: string;
  total_trips: number;
  total_distance_km: number;
  safety_score: number;
  status: string;
}

export const DriverAnalyticsDashboard = () => {
  const { organizationId } = useOrganization();
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, total_trips, total_distance_km, safety_score, status")
        .eq("organization_id", organizationId)
        .order("total_distance_km", { ascending: false });
      setDrivers((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const activeDrivers = drivers.filter(d => d.status === "active");
  const totalTrips = drivers.reduce((s, d) => s + (d.total_trips || 0), 0);
  const totalKm = drivers.reduce((s, d) => s + (d.total_distance_km || 0), 0);
  const avgSafety = drivers.length > 0 ? drivers.reduce((s, d) => s + (d.safety_score || 0), 0) / drivers.length : 0;
  const avgTripsPerDriver = activeDrivers.length > 0 ? totalTrips / activeDrivers.length : 0;
  const avgKmPerDriver = activeDrivers.length > 0 ? totalKm / activeDrivers.length : 0;
  const lowScoreDrivers = drivers.filter(d => d.safety_score < 70);

  const topDrivers = [...drivers].sort((a, b) => b.total_distance_km - a.total_distance_km).slice(0, 10);
  const bottomSafety = [...drivers].filter(d => d.safety_score > 0).sort((a, b) => a.safety_score - b.safety_score).slice(0, 10);
  const maxKm = topDrivers[0]?.total_distance_km || 1;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Driver Analytics & BI</h3>
        <p className="text-sm text-muted-foreground">Fleet-wide driver performance analytics and insights</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{activeDrivers.length}</p>
          <p className="text-[10px] text-muted-foreground">Active Drivers</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-xl font-bold">{totalTrips.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Trips</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-xl font-bold">{(totalKm / 1000).toFixed(0)}K</p>
          <p className="text-[10px] text-muted-foreground">Total km</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-xl font-bold">{avgSafety.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Avg Safety</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{avgTripsPerDriver.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Trips/Driver</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-xl font-bold">{lowScoreDrivers.length}</p>
          <p className="text-[10px] text-muted-foreground">Low Score (&lt;70)</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top 10 — Distance (km)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topDrivers.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-xs font-medium w-32 truncate">{d.first_name} {d.last_name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(d.total_distance_km / maxKm) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{d.total_distance_km.toLocaleString()}</span>
              </div>
            ))}
            {topDrivers.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Bottom 10 — Safety Score</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bottomSafety.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-xs font-medium w-32 truncate">{d.first_name} {d.last_name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.safety_score < 50 ? "bg-red-400" : d.safety_score < 70 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${d.safety_score}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{d.safety_score}</span>
              </div>
            ))}
            {bottomSafety.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
