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
import { DoorOpen, DoorClosed, AlertTriangle, ShieldAlert, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const emptyForm = { vehicle_id: "", event_type: "open", door_label: "", notes: "" };

const DoorSensorTab = ({ organizationId }: DoorSensorTabProps) => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-door", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("door_sensor_events").insert({
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        event_type: form.event_type,
        door_label: form.door_label || null,
        notes: form.notes || null,
        event_time: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-sensor-events"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("Door event recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("door_sensor_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["door-sensor-events"] });
      toast.success("Event deleted");
    },
    onError: (e: any) => toast.error(e.message),
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

      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Log Door Event</Button>
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
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No door sensor events recorded.</TableCell></TableRow>
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
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(evt.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5" /> Log Door Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Opened</SelectItem>
                  <SelectItem value="close">Closed</SelectItem>
                  <SelectItem value="tamper">Tamper</SelectItem>
                  <SelectItem value="forced_open">Forced Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Door Label</Label><Input value={form.door_label} onChange={e => setForm(p => ({ ...p, door_label: e.target.value }))} placeholder="e.g. Rear, Side" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." /></div>
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

export default DoorSensorTab;
