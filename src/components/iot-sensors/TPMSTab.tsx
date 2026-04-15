import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gauge, Thermometer, AlertTriangle, Battery, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TPMSTabProps {
  organizationId: string;
}

const POSITION_LABELS: Record<string, string> = {
  front_left: "FL", front_right: "FR", rear_left: "RL", rear_right: "RR",
  spare: "SP", axle2_left: "A2L", axle2_right: "A2R", axle3_left: "A3L", axle3_right: "A3R",
};

const ALARM_COLORS: Record<string, string> = {
  low_pressure: "bg-warning/10 text-warning border-warning/20",
  high_pressure: "bg-destructive/10 text-destructive border-destructive/20",
  high_temperature: "bg-destructive/10 text-destructive border-destructive/20",
  rapid_leak: "bg-destructive text-destructive-foreground",
  sensor_fault: "bg-muted text-muted-foreground",
};

const TPMSTab = ({ organizationId }: TPMSTabProps) => {
  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["tpms-readings", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tpms_readings")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Group latest reading per vehicle+tire for summary
  const latestPerTire: Record<string, any> = {};
  readings.forEach((r: any) => {
    const key = `${r.vehicle_id}:${r.tire_position}`;
    if (!latestPerTire[key]) latestPerTire[key] = r;
  });
  const latestReadings = Object.values(latestPerTire);

  const stats = {
    total: latestReadings.length,
    normal: latestReadings.filter((r: any) => !r.is_alarm).length,
    alarms: latestReadings.filter((r: any) => r.is_alarm).length,
    lowBattery: latestReadings.filter((r: any) => r.battery_percent != null && r.battery_percent < 20).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Gauge className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Active Tires</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Gauge className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{stats.normal}</p><p className="text-xs text-muted-foreground">Normal</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.alarms}</p><p className="text-xs text-muted-foreground">Alarms</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Battery className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{stats.lowBattery}</p><p className="text-xs text-muted-foreground">Low Battery</p></div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Pressure (PSI)</TableHead>
              <TableHead>Pressure (Bar)</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : readings.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No TPMS readings. Wireless BLE tire sensors will report pressure and temperature data here.</TableCell></TableRow>
            ) : readings.slice(0, 200).map((r: any) => (
              <TableRow key={r.id} className={r.is_alarm ? "bg-destructive/5" : ""}>
                <TableCell className="text-sm">{format(new Date(r.recorded_at), "MMM dd, HH:mm")}</TableCell>
                <TableCell className="font-medium">{r.vehicles?.plate_number || "—"}</TableCell>
                <TableCell><Badge variant="outline">{POSITION_LABELS[r.tire_position] || r.tire_position}</Badge></TableCell>
                <TableCell className="font-mono">{r.pressure_psi != null ? Number(r.pressure_psi).toFixed(1) : "—"}</TableCell>
                <TableCell className="font-mono">{r.pressure_bar != null ? Number(r.pressure_bar).toFixed(2) : "—"}</TableCell>
                <TableCell className="font-mono">{r.temperature_celsius != null ? `${Number(r.temperature_celsius).toFixed(1)}°C` : "—"}</TableCell>
                <TableCell>{r.battery_percent != null ? (
                  <span className={r.battery_percent < 20 ? "text-destructive font-bold" : ""}>{r.battery_percent}%</span>
                ) : "—"}</TableCell>
                <TableCell>
                  {r.is_alarm ? (
                    <Badge className={ALARM_COLORS[r.alarm_type] || "bg-destructive/10 text-destructive"}>{r.alarm_type?.replace("_", " ") || "Alarm"}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-success/10 text-success">Normal</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default TPMSTab;
