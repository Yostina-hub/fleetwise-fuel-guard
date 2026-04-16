import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserCheck, UserX, KeyRound, ShieldCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const emptyForm = { vehicle_id: "", auth_method: "ibutton", event_type: "login", tag_id: "" };

const DriverIdTab = ({ organizationId }: DriverIdTabProps) => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-driverid", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("driver_id_events").insert({
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        auth_method: form.auth_method,
        event_type: form.event_type,
        tag_id: form.tag_id || null,
        authenticated: form.event_type === "login",
        event_time: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-id-events"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("Driver ID event recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("driver_id_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-id-events"] });
      toast.success("Event deleted");
    },
    onError: (e: any) => toast.error(e.message),
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

      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Log ID Event</Button>
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
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No driver identification events.</TableCell></TableRow>
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
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(evt.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Log Driver ID Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auth Method</Label>
              <Select value={form.auth_method} onValueChange={v => setForm(p => ({ ...p, auth_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ibutton">iButton</SelectItem>
                  <SelectItem value="ble_tag">BLE Tag</SelectItem>
                  <SelectItem value="rfid">RFID</SelectItem>
                  <SelectItem value="nfc">NFC</SelectItem>
                  <SelectItem value="fingerprint">Fingerprint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="unknown_tag">Unknown Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tag ID</Label><Input value={form.tag_id} onChange={e => setForm(p => ({ ...p, tag_id: e.target.value }))} placeholder="e.g. 01-000A-123456" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.vehicle_id || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverIdTab;
