import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Siren, CheckCircle, Clock, Loader2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface PanicButtonTabProps {
  organizationId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "🔴 ACTIVE", color: "bg-destructive text-destructive-foreground" },
  acknowledged: { label: "Acknowledged", color: "bg-warning/10 text-warning border-warning/20" },
  dispatched: { label: "Dispatched", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border-success/20" },
  false_alarm: { label: "False Alarm", color: "bg-muted text-muted-foreground border-border" },
};

const PanicButtonTab = ({ organizationId }: PanicButtonTabProps) => {
  const queryClient = useQueryClient();
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState({ status: "resolved", notes: "" });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["panic-events", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("panic_button_events")
        .select("*, vehicles:vehicle_id(plate_number), drivers:driver_id(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("event_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolveDialog) return;
      const { error } = await (supabase as any)
        .from("panic_button_events")
        .update({
          status: resolution.status,
          resolution_notes: resolution.notes || null,
          resolved_at: new Date().toISOString(),
          response_time_seconds: Math.floor((Date.now() - new Date(resolveDialog.event_time).getTime()) / 1000),
        })
        .eq("id", resolveDialog.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panic-events"] });
      setResolveDialog(null);
      setResolution({ status: "resolved", notes: "" });
      toast.success("Emergency event updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeCount = events.filter((e: any) => e.status === "active").length;
  const avgResponse = events.filter((e: any) => e.response_time_seconds).reduce((sum: number, e: any) => sum + e.response_time_seconds, 0) / Math.max(events.filter((e: any) => e.response_time_seconds).length, 1);

  return (
    <div className="space-y-4">
      {activeCount > 0 && (
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3"
        >
          <Siren className="h-6 w-6 text-destructive" />
          <span className="font-bold text-destructive">{activeCount} ACTIVE EMERGENCY ALERT{activeCount > 1 ? "S" : ""} — Immediate response required</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Radio className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Total Events</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Siren className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{events.filter((e: any) => e.status === "resolved").length}</p><p className="text-xs text-muted-foreground">Resolved</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{avgResponse > 0 ? `${Math.round(avgResponse)}s` : "—"}</p><p className="text-xs text-muted-foreground">Avg Response</p></div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Response</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No panic button events. Events appear when SOS buttons are activated.</TableCell></TableRow>
            ) : events.map((evt: any) => {
              const cfg = STATUS_CONFIG[evt.status] || STATUS_CONFIG.active;
              return (
                <TableRow key={evt.id} className={evt.status === "active" ? "bg-destructive/5" : ""}>
                  <TableCell className="text-sm">{format(new Date(evt.event_time), "MMM dd, HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{evt.vehicles?.plate_number || "—"}</TableCell>
                  <TableCell>{evt.drivers ? `${evt.drivers.first_name} ${evt.drivers.last_name}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{evt.activation_type}</Badge></TableCell>
                  <TableCell><Badge className={cfg.color}>{cfg.label}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{evt.lat && evt.lng ? `${evt.lat.toFixed(4)}, ${evt.lng.toFixed(4)}` : "—"}</TableCell>
                  <TableCell>{evt.speed_kmh != null ? `${evt.speed_kmh} km/h` : "—"}</TableCell>
                  <TableCell>{evt.response_time_seconds ? `${evt.response_time_seconds}s` : (evt.status === "active" ? formatDistanceToNow(new Date(evt.event_time), { addSuffix: false }) : "—")}</TableCell>
                  <TableCell>
                    {(evt.status === "active" || evt.status === "acknowledged" || evt.status === "dispatched") && (
                      <Button size="sm" variant={evt.status === "active" ? "destructive" : "outline"} onClick={() => { setResolveDialog(evt); setResolution({ status: "resolved", notes: "" }); }}>
                        {evt.status === "active" ? "Respond" : "Update"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-destructive" /> Emergency Response</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={resolution.status} onValueChange={v => setResolution(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_alarm">False Alarm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolution Notes</Label>
              <Textarea value={resolution.notes} onChange={e => setResolution(p => ({ ...p, notes: e.target.value }))} placeholder="Describe the response and resolution..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PanicButtonTab;
