import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, CircuitBoard, Weight, AlertTriangle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const HardwareSensors = () => {
  const { organizationId } = useOrganization();
  const [sensorFilter, setSensorFilter] = useState("all");

  const { data: sensorData = [], isLoading } = useQuery({
    queryKey: ["hardware-sensor-data", organizationId, sensorFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from("hardware_sensor_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (sensorFilter !== "all") query = query.eq("sensor_type", sensorFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: sensorData.length,
    tpms: sensorData.filter((s: any) => s.sensor_type === "tpms").length,
    obd: sensorData.filter((s: any) => s.sensor_type === "obd2").length,
    load: sensorData.filter((s: any) => s.sensor_type === "load").length,
    alerts: sensorData.filter((s: any) => s.is_alert).length,
  };

  const renderReadings = (readings: any, type: string) => {
    if (!readings || typeof readings !== "object") return "—";
    switch (type) {
      case "tpms":
        return `FL:${readings.fl_psi || "—"} FR:${readings.fr_psi || "—"} RL:${readings.rl_psi || "—"} RR:${readings.rr_psi || "—"} PSI`;
      case "obd2":
        return readings.dtc_codes ? `DTCs: ${Array.isArray(readings.dtc_codes) ? readings.dtc_codes.join(", ") : readings.dtc_codes}` : `RPM:${readings.rpm || "—"} Temp:${readings.coolant_temp || "—"}°C`;
      case "load":
        return `${readings.weight_kg || "—"} kg / ${readings.max_kg || "—"} kg (${readings.weight_kg && readings.max_kg ? Math.round((readings.weight_kg / readings.max_kg) * 100) : "—"}%)`;
      default:
        return JSON.stringify(readings).slice(0, 60);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Hardware Sensors</h1><p className="text-muted-foreground">TPMS tire pressure, OBD-II engine diagnostics, and load/weight sensors</p></div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Readings</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Gauge className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{stats.tpms}</p><p className="text-sm text-muted-foreground">TPMS</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CircuitBoard className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{stats.obd}</p><p className="text-sm text-muted-foreground">OBD-II</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Weight className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{stats.load}</p><p className="text-sm text-muted-foreground">Load/Weight</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.alerts}</p><p className="text-sm text-muted-foreground">Alerts</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Sensors</TabsTrigger>
            <TabsTrigger value="tpms">TPMS</TabsTrigger>
            <TabsTrigger value="obd2">OBD-II / DTC</TabsTrigger>
            <TabsTrigger value="load">Load/Weight</TabsTrigger>
          </TabsList>

          {["all", "tpms", "obd2", "load"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card><Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Vehicle</TableHead><TableHead>Sensor Type</TableHead><TableHead>Sensor ID</TableHead><TableHead>Readings</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
                  (tab === "all" ? sensorData : sensorData.filter((s: any) => s.sensor_type === tab)).length === 0 ?
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sensor data recorded. Connect TPMS, OBD-II, or load sensors to begin.</TableCell></TableRow> :
                  (tab === "all" ? sensorData : sensorData.filter((s: any) => s.sensor_type === tab)).map((s: any) => (
                    <TableRow key={s.id} className={s.is_alert ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm">{format(new Date(s.recorded_at), "MMM dd, HH:mm")}</TableCell>
                      <TableCell className="font-medium">{s.vehicles?.plate_number || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="uppercase">{s.sensor_type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{s.sensor_id || "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{renderReadings(s.readings, s.sensor_type)}</TableCell>
                      <TableCell>
                        {s.is_alert ? <Badge variant="destructive">{s.alert_type || "Alert"}</Badge> : <Badge variant="secondary">Normal</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default HardwareSensors;
