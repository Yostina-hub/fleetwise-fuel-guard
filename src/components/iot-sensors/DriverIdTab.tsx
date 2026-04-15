import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCheck, UserX, KeyRound, Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DriverIdTabProps {
  organizationId: string;
}

const METHOD_ICONS: Record<string, string> = {
  ibutton: "🔑", ble_tag: "📡", rfid: "📟", nfc: "📲", facial: "👤", fingerprint: "🖐️",
};

const EVENT_COLORS: Record<string, string> = {
  login: "bg-success/10 text-success border-success/20",
  logout: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  unknown_tag: "bg-warning/10 text-warning border-warning/20",
};

const DriverIdTab = ({ organizationId }: DriverIdTabProps) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["driver-id-events", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_id_events")
        .select("*, vehicles:vehicle_id(plate_number), drivers:driver_id(first_name, last_name)")
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
    authenticated: events.filter((e: any) => e.authenticated).length,
    rejected: events.filter((e: any) => e.event_type === "rejected").length,
    unknown: events.filter((e: any) => e.event_type === "unknown_tag").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><KeyRound className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Events</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{stats.authenticated}</p><p className="text-xs text-muted-foreground">Authenticated</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><UserX className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{stats.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><UserCheck className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{stats.unknown}</p><p className="text-xs text-muted-foreground">Unknown Tags</p></div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Tag ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No driver identification events. iButton, BLE tags, and RFID authentication events will appear here.</TableCell></TableRow>
            ) : events.map((evt: any) => (
              <TableRow key={evt.id} className={evt.event_type === "rejected" || evt.event_type === "unknown_tag" ? "bg-destructive/5" : ""}>
                <TableCell className="text-sm">{format(new Date(evt.event_time), "MMM dd, HH:mm:ss")}</TableCell>
                <TableCell className="font-medium">{evt.vehicles?.plate_number || "—"}</TableCell>
                <TableCell>{evt.drivers ? `${evt.drivers.first_name} ${evt.drivers.last_name}` : <span className="text-muted-foreground italic">Unknown</span>}</TableCell>
                <TableCell><span className="mr-1">{METHOD_ICONS[evt.auth_method] || "🔒"}</span>{evt.auth_method?.toUpperCase()}</TableCell>
                <TableCell className="font-mono text-xs">{evt.tag_id || "—"}</TableCell>
                <TableCell><Badge className={EVENT_COLORS[evt.event_type] || ""}>{evt.event_type}</Badge></TableCell>
                <TableCell>
                  {evt.authenticated ? (
                    <Badge variant="secondary" className="bg-success/10 text-success">✓ Yes</Badge>
                  ) : (
                    <Badge variant="destructive">✗ No</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{evt.lat && evt.lng ? `${evt.lat.toFixed(4)}, ${evt.lng.toFixed(4)}` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default DriverIdTab;
