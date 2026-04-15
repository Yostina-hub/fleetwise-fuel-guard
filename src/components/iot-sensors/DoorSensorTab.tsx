import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoorOpen, DoorClosed, AlertTriangle, ShieldAlert, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DoorSensorTabProps {
  organizationId: string;
}

const EVENT_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  open: { icon: DoorOpen, label: "Opened", color: "bg-warning/10 text-warning border-warning/20" },
  close: { icon: DoorClosed, label: "Closed", color: "bg-success/10 text-success border-success/20" },
  tamper: { icon: ShieldAlert, label: "Tamper", color: "bg-destructive/10 text-destructive border-destructive/20" },
  forced_open: { icon: AlertTriangle, label: "Forced Open", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DoorSensorTab = ({ organizationId }: DoorSensorTabProps) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["door-sensor-events", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("door_sensor_events")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const stats = {
    total: events.length,
    tampers: events.filter((e: any) => e.event_type === "tamper" || e.event_type === "forced_open").length,
    outsideZone: events.filter((e: any) => e.in_approved_zone === false).length,
    alerts: events.filter((e: any) => e.alert_triggered).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><DoorOpen className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Events</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><ShieldAlert className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.tampers}</p><p className="text-xs text-muted-foreground">Tamper / Forced</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><MapPin className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{stats.outsideZone}</p><p className="text-xs text-muted-foreground">Outside Approved Zone</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.alerts}</p><p className="text-xs text-muted-foreground">Alerts Triggered</p></div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Door</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No door sensor events recorded. Events will appear when magnetic reed sensors report activity.</TableCell></TableRow>
            ) : events.map((evt: any) => {
              const cfg = EVENT_CONFIG[evt.event_type] || EVENT_CONFIG.open;
              return (
                <TableRow key={evt.id} className={evt.alert_triggered ? "bg-destructive/5" : ""}>
                  <TableCell className="text-sm">{format(new Date(evt.event_time), "MMM dd, HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{evt.vehicles?.plate_number || "—"}</TableCell>
                  <TableCell><Badge className={cfg.color}>{cfg.label}</Badge></TableCell>
                  <TableCell>{evt.door_label || "Main"}</TableCell>
                  <TableCell>
                    {evt.in_approved_zone === true && <Badge variant="secondary" className="bg-success/10 text-success">Approved</Badge>}
                    {evt.in_approved_zone === false && <Badge variant="destructive">Outside Zone</Badge>}
                    {evt.in_approved_zone == null && "—"}
                  </TableCell>
                  <TableCell>{evt.duration_seconds != null ? `${evt.duration_seconds}s` : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{evt.lat && evt.lng ? `${evt.lat.toFixed(4)}, ${evt.lng.toFixed(4)}` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default DoorSensorTab;
