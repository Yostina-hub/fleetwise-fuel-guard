import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Thermometer, AlertTriangle, BarChart3, DoorOpen } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const ColdChain = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("live");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const { organizationId } = useOrganization();

  // Fetch latest readings per vehicle (distinct on vehicle_id)
  const { data: latestReadings = [], isLoading } = useQuery({
    queryKey: ["cold-chain-latest", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("*, vehicles:vehicle_id(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      // Group by vehicle_id, keep latest
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.vehicle_id]) map[r.vehicle_id] = r;
      });
      return Object.values(map);
    },
    enabled: !!organizationId,
  });

  // Fetch alarms
  const { data: alarms = [] } = useQuery({
    queryKey: ["cold-chain-alarms", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId!)
        .eq("is_alarm", true)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch 24h chart data for selected vehicle
  const chartVehicleId = selectedVehicleId || (latestReadings[0] as any)?.vehicle_id;
  const { data: chartData = [] } = useQuery({
    queryKey: ["cold-chain-chart", chartVehicleId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("recorded_at, temperature_celsius, humidity_percent")
        .eq("vehicle_id", chartVehicleId!)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        time: format(new Date(r.recorded_at), "HH:mm"),
        temp: r.temperature_celsius,
        humidity: r.humidity_percent,
      }));
    },
    enabled: !!chartVehicleId,
  });

  const normalCount = latestReadings.filter((r: any) => !r.is_alarm).length;
  const alarmCount = latestReadings.filter((r: any) => r.is_alarm).length;
  const doorsOpen = latestReadings.filter((r: any) => r.door_status === "open").length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Thermometer className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Cold Chain Monitoring</h1>
            <p className="text-muted-foreground text-xs">Real-time temperature & humidity tracking for refrigerated vehicles</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Monitored Vehicles</p>
            <p className="text-2xl font-bold">{latestReadings.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Normal</p>
            <p className="text-2xl font-bold text-emerald-600">{normalCount}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Alarms</p>
            <p className="text-2xl font-bold text-destructive">{alarmCount}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Doors Open</p>
            <p className="text-2xl font-bold text-amber-600">{doorsOpen}</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="live" className="gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Live Status</TabsTrigger>
            <TabsTrigger value="chart" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Temperature Chart</TabsTrigger>
            <TabsTrigger value="alarms" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Alarms ({alarms.length})</TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="live" className="mt-0 space-y-3">
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
              ) : latestReadings.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No cold chain readings yet.</p>
                  <p className="text-xs mt-1">Temperature data from refrigerated vehicles will appear here.</p>
                </CardContent></Card>
              ) : (
                latestReadings.map((r: any) => {
                  const isAlarm = r.is_alarm || (r.max_threshold && r.temperature_celsius > r.max_threshold);
                  return (
                    <Card key={r.vehicle_id} className={isAlarm ? "border-destructive/50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{r.vehicles?.plate_number || "Unknown"}</span>
                              {isAlarm ? <Badge variant="destructive">ALARM</Badge> : <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{t('common.normal', 'Normal')}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {r.vehicles?.make} {r.vehicles?.model} • {r.sensor_id ? `Sensor: ${r.sensor_id}` : ""} • Last: {format(new Date(r.recorded_at), "HH:mm:ss")}
                            </p>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <Thermometer className="w-4 h-4 mx-auto text-cyan-500" />
                              <p className={`font-bold ${isAlarm ? "text-destructive" : ""}`}>{r.temperature_celsius?.toFixed(1)}°C</p>
                              <p className="text-xs text-muted-foreground">{r.min_threshold ?? "—"} to {r.max_threshold ?? "—"}°C</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Humidity</p>
                              <p className="font-bold">{r.humidity_percent ?? "—"}%</p>
                            </div>
                            <div className="text-center">
                              <DoorOpen className={`w-4 h-4 mx-auto ${r.door_status === "open" ? "text-amber-500" : "text-muted-foreground"}`} />
                              <p className={`font-bold capitalize ${r.door_status === "open" ? "text-amber-600" : ""}`}>{r.door_status || "—"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Compressor</p>
                              <p className="font-bold capitalize">{r.compressor_status || "—"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="chart" className="mt-0 space-y-4">
              {latestReadings.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {latestReadings.map((r: any) => (
                    <Button
                      key={r.vehicle_id}
                      size="sm"
                      variant={chartVehicleId === r.vehicle_id ? "default" : "outline"}
                      onClick={() => setSelectedVehicleId(r.vehicle_id)}
                    >
                      {r.vehicles?.plate_number || "Unknown"}
                    </Button>
                  ))}
                </div>
              )}
              <Card>
                <CardHeader><CardTitle className="text-lg">24h Temperature Trend</CardTitle></CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No chart data available for this period.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Temperature (°C)" />
                        <Line type="monotone" dataKey="humidity" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} name="Humidity (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alarms" className="mt-0 space-y-3">
              {alarms.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No alarms recorded.</p>
                </CardContent></Card>
              ) : (
                alarms.map((alarm: any) => (
                  <Card key={alarm.id} className={alarm.alarm_type === "critical" ? "border-destructive/50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{alarm.vehicles?.plate_number || "Unknown"}</span>
                            <Badge variant={alarm.alarm_type === "critical" ? "destructive" : "outline"} className="capitalize">
                              {alarm.alarm_type || "Temperature"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Temperature: {alarm.temperature_celsius?.toFixed(1)}°C 
                            {alarm.max_threshold ? ` (max: ${alarm.max_threshold}°C)` : ""}
                            {alarm.door_status ? ` • Door: ${alarm.door_status}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{format(new Date(alarm.recorded_at), "MMM dd, HH:mm")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ColdChain;
