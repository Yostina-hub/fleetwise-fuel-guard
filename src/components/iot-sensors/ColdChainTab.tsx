import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Thermometer, AlertTriangle, BarChart3, DoorOpen, Settings, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

const emptyReadingForm = {
  vehicle_id: "",
  temperature_celsius: "",
  humidity_percent: "",
  door_status: "closed",
  compressor_status: "running",
  sensor_id: "",
  min_threshold: "-25",
  max_threshold: "8",
};

interface ColdChainTabProps {
  organizationId: string;
}

const ColdChainTab = ({ organizationId }: ColdChainTabProps) => {
  const [activeTab, setActiveTab] = useState("live");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [readingForm, setReadingForm] = useState(emptyReadingForm);

  const [complianceRange, setComplianceRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const [thresholds, setThresholds] = useState<Record<string, { min: string; max: string }>>({});

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-cold-chain", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const logReadingMutation = useMutation({
    mutationFn: async () => {
      const temp = parseFloat(readingForm.temperature_celsius);
      if (isNaN(temp)) throw new Error("Temperature is required");
      const minT = parseFloat(readingForm.min_threshold);
      const maxT = parseFloat(readingForm.max_threshold);
      const isAlarm = temp < minT || temp > maxT;
      const { error } = await (supabase as any).from("cold_chain_readings").insert([{
        organization_id: organizationId,
        vehicle_id: readingForm.vehicle_id,
        temperature_celsius: temp,
        humidity_percent: readingForm.humidity_percent ? parseFloat(readingForm.humidity_percent) : null,
        door_status: readingForm.door_status,
        compressor_status: readingForm.compressor_status,
        sensor_id: readingForm.sensor_id || null,
        min_threshold: minT,
        max_threshold: maxT,
        is_alarm: isAlarm,
        alarm_type: isAlarm ? (temp < minT ? "low_temp" : "high_temp") : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cold-chain-latest"] });
      queryClient.invalidateQueries({ queryKey: ["cold-chain-alarms"] });
      setShowLogDialog(false);
      setReadingForm(emptyReadingForm);
      toast.success("Cold chain reading logged");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReadingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cold_chain_readings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cold-chain-latest"] });
      queryClient.invalidateQueries({ queryKey: ["cold-chain-alarms"] });
      toast.success("Reading deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: latestReadings = [], isLoading } = useQuery({
    queryKey: ["cold-chain-latest", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("*, vehicles:vehicle_id(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.vehicle_id]) map[r.vehicle_id] = r;
      });
      const readings = Object.values(map);
      const newThresholds: Record<string, { min: string; max: string }> = {};
      readings.forEach((r: any) => {
        if (!thresholds[r.vehicle_id]) {
          newThresholds[r.vehicle_id] = {
            min: String(r.min_threshold ?? -25),
            max: String(r.max_threshold ?? 8),
          };
        }
      });
      if (Object.keys(newThresholds).length > 0) {
        setThresholds(prev => ({ ...newThresholds, ...prev }));
      }
      return readings;
    },
    enabled: !!organizationId,
  });

  const { data: alarms = [] } = useQuery({
    queryKey: ["cold-chain-alarms", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId)
        .eq("is_alarm", true)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: complianceData = [] } = useQuery({
    queryKey: ["cold-chain-compliance", organizationId, complianceRange],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("vehicle_id, temperature_celsius, min_threshold, max_threshold, is_alarm, recorded_at, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId)
        .gte("recorded_at", complianceRange.start)
        .lte("recorded_at", complianceRange.end + "T23:59:59")
        .order("recorded_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const chartVehicleId = selectedVehicleId || (latestReadings[0] as any)?.vehicle_id;
  const { data: chartData = [] } = useQuery({
    queryKey: ["cold-chain-chart", chartVehicleId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("cold_chain_readings")
        .select("recorded_at, temperature_celsius, humidity_percent, door_status")
        .eq("vehicle_id", chartVehicleId!)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        time: format(new Date(r.recorded_at), "HH:mm"),
        temp: r.temperature_celsius,
        humidity: r.humidity_percent,
        door: r.door_status === "open" ? 1 : 0,
      }));
    },
    enabled: !!chartVehicleId,
  });

  const normalCount = latestReadings.filter((r: any) => !r.is_alarm).length;
  const alarmCount = latestReadings.filter((r: any) => r.is_alarm).length;
  const doorsOpen = latestReadings.filter((r: any) => r.door_status === "open").length;

  const complianceByVehicle = (() => {
    const map: Record<string, { plate: string; total: number; inRange: number }> = {};
    complianceData.forEach((r: any) => {
      if (!map[r.vehicle_id]) map[r.vehicle_id] = { plate: r.vehicles?.plate_number || "Unknown", total: 0, inRange: 0 };
      map[r.vehicle_id].total++;
      const min = r.min_threshold ?? -25;
      const max = r.max_threshold ?? 8;
      if (r.temperature_celsius >= min && r.temperature_celsius <= max) {
        map[r.vehicle_id].inRange++;
      }
    });
    return Object.entries(map).map(([vid, d]) => ({
      vehicle_id: vid,
      plate: d.plate,
      total: d.total,
      compliance: d.total > 0 ? Math.round((d.inRange / d.total) * 100) : 100,
    }));
  })();

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <Button onClick={() => { setReadingForm(emptyReadingForm); setShowLogDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Log Reading</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="live" className="gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Live Status</TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Temperature Chart</TabsTrigger>
          <TabsTrigger value="alarms" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Alarms ({alarms.length})</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Compliance</TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Thresholds</TabsTrigger>
        </TabsList>

        {/* Live Status */}
        <TabsContent value="live" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
          ) : latestReadings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No cold chain readings yet.</p>
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
                          {isAlarm ? <Badge variant="destructive">ALARM</Badge> : <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Normal</Badge>}
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

        {/* Chart */}
        <TabsContent value="chart" className="space-y-4">
          {latestReadings.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {latestReadings.map((r: any) => (
                <Button key={r.vehicle_id} size="sm" variant={chartVehicleId === r.vehicle_id ? "default" : "outline"} onClick={() => setSelectedVehicleId(r.vehicle_id)}>
                  {r.vehicles?.plate_number || "Unknown"}
                </Button>
              ))}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle className="text-lg">24h Temperature Trend</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No chart data available.</div>
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

        {/* Alarms */}
        <TabsContent value="alarms" className="space-y-3">
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
                        <Badge variant={alarm.alarm_type === "critical" ? "destructive" : "outline"} className="capitalize">{alarm.alarm_type || "Temperature"}</Badge>
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

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Temperature Compliance Report</CardTitle>
                <div className="flex items-center gap-2">
                  <Input type="date" className="w-36 h-8 text-xs" value={complianceRange.start} onChange={e => setComplianceRange(r => ({ ...r, start: e.target.value }))} />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" className="w-36 h-8 text-xs" value={complianceRange.end} onChange={e => setComplianceRange(r => ({ ...r, end: e.target.value }))} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {complianceByVehicle.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No data for selected period.</div>
              ) : (
                <div className="space-y-4">
                  {complianceByVehicle.map((v) => (
                    <div key={v.vehicle_id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{v.plate}</span>
                          <Badge className={v.compliance >= 95 ? "bg-success/10 text-success" : v.compliance >= 80 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}>
                            {v.compliance >= 95 ? "Compliant" : v.compliance >= 80 ? "Warning" : "Non-Compliant"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{v.total} readings in period • {v.total - Math.round(v.total * v.compliance / 100)} out-of-range</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className={`text-2xl font-bold ${v.compliance >= 95 ? "text-success" : v.compliance >= 80 ? "text-warning" : "text-destructive"}`}>{v.compliance}%</p>
                        <p className="text-xs text-muted-foreground">compliance</p>
                      </div>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${v.compliance >= 95 ? "bg-success" : v.compliance >= 80 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${v.compliance}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thresholds */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader><CardTitle className="text-lg">Per-Vehicle Temperature Thresholds</CardTitle></CardHeader>
            <CardContent>
              {latestReadings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No vehicles to configure.</div>
              ) : (
                <div className="space-y-4">
                  {latestReadings.map((r: any) => {
                    const t = thresholds[r.vehicle_id] || { min: "-25", max: "8" };
                    return (
                      <div key={r.vehicle_id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <span className="font-semibold">{r.vehicles?.plate_number || "Unknown"}</span>
                          <p className="text-xs text-muted-foreground">{r.vehicles?.make} {r.vehicles?.model} • Current: {r.temperature_celsius?.toFixed(1)}°C</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <Label className="text-[10px]">Min °C</Label>
                            <Input type="number" className="w-20 h-8 text-sm" value={t.min} onChange={e => setThresholds(prev => ({ ...prev, [r.vehicle_id]: { ...prev[r.vehicle_id], min: e.target.value } }))} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Max °C</Label>
                            <Input type="number" className="w-20 h-8 text-sm" value={t.max} onChange={e => setThresholds(prev => ({ ...prev, [r.vehicle_id]: { ...prev[r.vehicle_id], max: e.target.value } }))} />
                          </div>
                          <Button size="sm" variant="outline" className="h-8 mt-4" onClick={async () => {
                            try {
                              const { error } = await (supabase as any)
                                .from("cold_chain_readings")
                                .update({
                                  min_threshold: parseFloat(t.min),
                                  max_threshold: parseFloat(t.max),
                                })
                                .eq("vehicle_id", r.vehicle_id)
                                .eq("organization_id", organizationId);
                              if (error) throw error;
                              toast.success(`Thresholds updated for ${r.vehicles?.plate_number}`);
                              queryClient.invalidateQueries({ queryKey: ["cold-chain-latest"] });
                            } catch (e: any) { toast.error(e.message); }
                          }}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Reading Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5" /> Log Cold Chain Reading</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={readingForm.vehicle_id || undefined} onValueChange={v => setReadingForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.filter((v: any) => v.id).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Temperature (°C) *</Label><Input value={readingForm.temperature_celsius} onChange={e => setReadingForm(p => ({ ...p, temperature_celsius: e.target.value }))} placeholder="-18.5" /></div>
              <div><Label>Humidity (%)</Label><Input value={readingForm.humidity_percent} onChange={e => setReadingForm(p => ({ ...p, humidity_percent: e.target.value }))} placeholder="45" /></div>
              <div><Label>Min Threshold (°C)</Label><Input value={readingForm.min_threshold} onChange={e => setReadingForm(p => ({ ...p, min_threshold: e.target.value }))} /></div>
              <div><Label>Max Threshold (°C)</Label><Input value={readingForm.max_threshold} onChange={e => setReadingForm(p => ({ ...p, max_threshold: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Door Status</Label>
                <Select value={readingForm.door_status} onValueChange={v => setReadingForm(p => ({ ...p, door_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compressor</Label>
                <Select value={readingForm.compressor_status} onValueChange={v => setReadingForm(p => ({ ...p, compressor_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="standby">Standby</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Sensor ID</Label><Input value={readingForm.sensor_id} onChange={e => setReadingForm(p => ({ ...p, sensor_id: e.target.value }))} placeholder="TEMP-001" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
            <Button onClick={() => logReadingMutation.mutate()} disabled={!readingForm.vehicle_id || !readingForm.temperature_celsius || logReadingMutation.isPending}>
              {logReadingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Log Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColdChainTab;
