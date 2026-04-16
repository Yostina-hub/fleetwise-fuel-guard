import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  organizationId: string;
  sensorTypeFilter?: string;
}

const renderReadings = (readings: any, type: string) => {
  if (!readings || typeof readings !== "object") return "—";
  switch (type) {
    case "tpms": return `FL:${readings.fl_psi || "—"} FR:${readings.fr_psi || "—"} RL:${readings.rl_psi || "—"} RR:${readings.rr_psi || "—"} PSI`;
    case "obd2": return readings.dtc_codes ? `DTCs: ${Array.isArray(readings.dtc_codes) ? readings.dtc_codes.join(", ") : readings.dtc_codes}` : `RPM:${readings.rpm || "—"} Temp:${readings.coolant_temp || "—"}°C`;
    case "load": return `${readings.weight_kg || "—"} kg / ${readings.max_kg || "—"} kg (${readings.weight_kg && readings.max_kg ? Math.round((readings.weight_kg / readings.max_kg) * 100) : "—"}%)`;
    default: return JSON.stringify(readings).slice(0, 60);
  }
};

const HardwareSensorDataTab = ({ organizationId, sensorTypeFilter }: Props) => {
  const [filter, setFilter] = useState(sensorTypeFilter || "all");

  const { data: sensorData = [], isLoading } = useQuery({
    queryKey: ["hardware-sensor-data", organizationId, filter],
    queryFn: async () => {
      let query = supabase
        .from("hardware_sensor_data")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (filter !== "all") query = query.eq("sensor_type", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return (
    <div className="space-y-4">
      {!sensorTypeFilter && (
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tpms">TPMS</SelectItem>
            <SelectItem value="obd2">OBD-II</SelectItem>
            <SelectItem value="load">Load/Weight</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sensor ID</TableHead>
              <TableHead>Readings</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : sensorData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sensor data recorded. Connect sensors to begin.</TableCell></TableRow>
            ) : sensorData.map((s: any) => (
              <TableRow key={s.id} className={s.is_alert ? "bg-destructive/5" : ""}>
                <TableCell className="text-sm">{format(new Date(s.recorded_at), "MMM dd, HH:mm")}</TableCell>
                <TableCell className="font-medium">{s.vehicles?.plate_number || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="uppercase">{s.sensor_type}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{s.sensor_id || "—"}</TableCell>
                <TableCell className="font-mono text-xs max-w-[300px] truncate">{renderReadings(s.readings, s.sensor_type)}</TableCell>
                <TableCell>{s.is_alert ? <Badge variant="destructive">{s.alert_type || "Alert"}</Badge> : <Badge variant="secondary">Normal</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default HardwareSensorDataTab;
