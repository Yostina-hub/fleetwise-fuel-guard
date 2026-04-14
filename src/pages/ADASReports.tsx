import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Eye, AlertTriangle, Brain, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const ADASReports = () => {
  const { organizationId } = useOrganization();
  const [period, setPeriod] = useState("30d");

  const { data: events = [] } = useQuery({
    queryKey: ["adas-events", organizationId, period],
    queryFn: async () => {
      if (!organizationId) return [];
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await supabase
        .from("dash_cam_events")
        .select("*, vehicles(plate_number), drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .gte("event_time", since)
        .order("event_time", { ascending: false });
      return data || [];
    },
    enabled: !!organizationId,
  });

  const adasTypes = ["lane_departure", "forward_collision", "tailgating", "pedestrian_warning", "traffic_sign"];
  const dmsTypes = ["drowsiness", "distraction", "phone_usage", "smoking", "seatbelt", "yawning"];

  const countByType = (type: string) => events.filter((e: any) => e.event_type === type || (e.ai_labels && JSON.stringify(e.ai_labels).toLowerCase().includes(type))).length;

  const adasStats = adasTypes.map(t => ({ type: t, count: countByType(t) }));
  const dmsStats = dmsTypes.map(t => ({ type: t, count: countByType(t) }));
  const totalADAS = adasStats.reduce((s, i) => s + i.count, 0);
  const totalDMS = dmsStats.reduce((s, i) => s + i.count, 0);

  // Driver risk scores from DMS events
  const driverRisks = events.reduce((acc: any, e: any) => {
    if (!e.driver_id || !e.drivers) return acc;
    const name = `${e.drivers.first_name} ${e.drivers.last_name}`;
    if (!acc[e.driver_id]) acc[e.driver_id] = { name, events: 0, critical: 0, types: {} as Record<string, number> };
    acc[e.driver_id].events++;
    if (e.severity === "critical" || e.severity === "high") acc[e.driver_id].critical++;
    const et = e.event_type || "unknown";
    acc[e.driver_id].types[et] = (acc[e.driver_id].types[et] || 0) + 1;
    return acc;
  }, {});

  const topDrivers = Object.values(driverRisks).sort((a: any, b: any) => b.events - a.events).slice(0, 10) as any[];

  // Vehicle correlation
  const vehicleRisks = events.reduce((acc: any, e: any) => {
    if (!e.vehicle_id || !e.vehicles) return acc;
    const plate = e.vehicles.plate_number;
    if (!acc[e.vehicle_id]) acc[e.vehicle_id] = { plate, events: 0, critical: 0 };
    acc[e.vehicle_id].events++;
    if (e.severity === "critical" || e.severity === "high") acc[e.vehicle_id].critical++;
    return acc;
  }, {});

  const topVehicles = Object.values(vehicleRisks).sort((a: any, b: any) => b.events - a.events).slice(0, 10) as any[];

  // Hourly distribution
  const hourlyDist = Array(24).fill(0);
  events.forEach((e: any) => { const h = new Date(e.event_time).getHours(); hourlyDist[h]++; });
  const maxHourly = Math.max(...hourlyDist, 1);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ADAS & DMS Analytics</h1>
            <p className="text-muted-foreground">Advanced Driver Assistance & Driver Monitoring System reports</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{totalADAS}</p><p className="text-sm text-muted-foreground">ADAS Alerts</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Eye className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{totalDMS}</p><p className="text-sm text-muted-foreground">DMS Alerts</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{events.filter((e: any) => e.severity === "critical").length}</p><p className="text-sm text-muted-foreground">Critical Events</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Brain className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{events.filter((e: any) => e.ai_detected).length}</p><p className="text-sm text-muted-foreground">AI Detections</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="adas">
          <TabsList>
            <TabsTrigger value="adas">ADAS Events</TabsTrigger>
            <TabsTrigger value="dms">DMS Events</TabsTrigger>
            <TabsTrigger value="drivers">Driver Risk</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicle Correlation</TabsTrigger>
            <TabsTrigger value="time">Time Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="adas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adasStats.map(s => (
                <Card key={s.type}><CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium capitalize">{s.type.replace(/_/g, " ")}</p><Badge variant={s.count > 10 ? "destructive" : "secondary"}>{s.count}</Badge></div>
                  <Progress value={totalADAS > 0 ? (s.count / totalADAS) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{totalADAS > 0 ? ((s.count / totalADAS) * 100).toFixed(1) : 0}% of ADAS events</p>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dms">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dmsStats.map(s => (
                <Card key={s.type}><CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium capitalize">{s.type.replace(/_/g, " ")}</p><Badge variant={s.count > 5 ? "destructive" : "secondary"}>{s.count}</Badge></div>
                  <Progress value={totalDMS > 0 ? (s.count / totalDMS) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{totalDMS > 0 ? ((s.count / totalDMS) * 100).toFixed(1) : 0}% of DMS events</p>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader><CardTitle>Driver Risk Ranking</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Rank</TableHead><TableHead>Driver</TableHead><TableHead>Total Events</TableHead><TableHead>Critical/High</TableHead><TableHead>Top Event Type</TableHead><TableHead>Risk Level</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {topDrivers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No driver event data yet</TableCell></TableRow>
                    ) : topDrivers.map((d, i) => {
                      const topType = Object.entries(d.types).sort(([,a]: any, [,b]: any) => b - a)[0];
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-bold">{i + 1}</TableCell>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell>{d.events}</TableCell>
                          <TableCell>{d.critical}</TableCell>
                          <TableCell className="capitalize text-sm">{topType ? `${String(topType[0]).replace(/_/g, " ")} (${topType[1]})` : "—"}</TableCell>
                          <TableCell><Badge variant={d.critical > 3 ? "destructive" : d.events > 5 ? "default" : "secondary"}>{d.critical > 3 ? "High" : d.events > 5 ? "Medium" : "Low"}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles">
            <Card>
              <CardHeader><CardTitle>Vehicle Incident Correlation</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Rank</TableHead><TableHead>Vehicle</TableHead><TableHead>Total Events</TableHead><TableHead>Critical/High</TableHead><TableHead>Risk</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {topVehicles.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vehicle correlation data yet</TableCell></TableRow>
                    ) : topVehicles.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{v.plate}</TableCell>
                        <TableCell>{v.events}</TableCell>
                        <TableCell>{v.critical}</TableCell>
                        <TableCell><Badge variant={v.critical > 3 ? "destructive" : v.events > 5 ? "default" : "secondary"}>{v.critical > 3 ? "High" : v.events > 5 ? "Medium" : "Low"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Hourly Event Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-48">
                  {hourlyDist.map((count, h) => (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/80 rounded-t transition-all" style={{ height: `${(count / maxHourly) * 160}px`, minHeight: count > 0 ? "4px" : "0px" }} />
                      <span className="text-[10px] text-muted-foreground">{h}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">Hour of day (0-23) — higher bars indicate more incidents</p>
                {hourlyDist.some(c => c > 0) && (
                  <div className="mt-4 p-3 bg-accent rounded-lg text-sm">
                    <p className="font-medium">Peak hours: {hourlyDist.map((c, h) => ({ h, c })).sort((a, b) => b.c - a.c).slice(0, 3).filter(x => x.c > 0).map(x => `${x.h}:00 (${x.c} events)`).join(", ") || "No data"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ADASReports;
