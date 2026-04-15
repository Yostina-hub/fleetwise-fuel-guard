import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, Unlock, Play, Square, ChevronDown, ChevronRight, AlertTriangle, Shield, MapPin } from "lucide-react";
import { useImmobilization, ImmobilizationStep } from "@/hooks/useImmobilization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
};

const stepStatusColors: Record<string, string> = {
  pending: "bg-muted",
  sent: "bg-warning/20 text-warning",
  acknowledged: "bg-success/20 text-success",
  failed: "bg-destructive/20 text-destructive",
  skipped: "bg-muted text-muted-foreground line-through",
};

const ImmobilizationTab = () => {
  const { organizationId } = useOrganization();
  const { sequences, loading, initiateSequence, cancelSequence, fetchSteps } = useImmobilization();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stepsData, setStepsData] = useState<Record<string, ImmobilizationStep[]>>({});
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Form state
  const [formVehicleId, setFormVehicleId] = useState("");
  const [formTriggerType, setFormTriggerType] = useState<string>("unauthorized_movement");
  const [formNotes, setFormNotes] = useState("");
  const [formInterval, setFormInterval] = useState("30");

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-for-immob", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId)
        .order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!stepsData[id]) {
      try {
        const steps = await fetchSteps(id);
        setStepsData(prev => ({ ...prev, [id]: steps }));
      } catch { /* ignore */ }
    }
  };

  const handleCreate = async () => {
    if (!formVehicleId) return;
    const ok = await initiateSequence({
      vehicleId: formVehicleId,
      triggerType: formTriggerType as any,
      stepIntervalSeconds: parseInt(formInterval) || 30,
      notes: formNotes || undefined,
    });
    if (ok) {
      setCreateOpen(false);
      setFormVehicleId("");
      setFormNotes("");
    }
  };

  const handleCancel = async () => {
    if (!cancelDialogId) return;
    await cancelSequence(cancelDialogId, cancelReason);
    setCancelDialogId(null);
    setCancelReason("");
  };

  const getVehicleName = (vehicleId: string) => {
    const v = vehicles.find((v: any) => v.id === vehicleId);
    return v ? `${(v as any).plate_number} - ${(v as any).make} ${(v as any).model}` : vehicleId.slice(0, 8);
  };

  const activeCount = sequences.filter(s => s.sequence_status === 'in_progress').length;
  const completedCount = sequences.filter(s => s.sequence_status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Play className="w-5 h-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{activeCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><Lock className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completedCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><AlertTriangle className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Unauthorized</p><p className="text-2xl font-bold">{sequences.filter(s => s.trigger_type === 'unauthorized_movement').length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50"><MapPin className="w-5 h-5 text-accent-foreground" /></div>
            <div><p className="text-sm text-muted-foreground">Geofence</p><p className="text-2xl font-bold">{sequences.filter(s => s.trigger_type === 'geofence_breach').length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Immobilization Sequences</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2"><Lock className="w-4 h-4" /> Initiate Immobilization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Initiate Gradual Immobilization</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Vehicle</Label>
                <Select value={formVehicleId} onValueChange={setFormVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger Type</Label>
                <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unauthorized_movement">Unauthorized Movement</SelectItem>
                    <SelectItem value="geofence_breach">Geofence Breach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Step Interval (seconds)</Label>
                <Input type="number" value={formInterval} onChange={e => setFormInterval(e.target.value)} min={10} max={300} />
                <p className="text-xs text-muted-foreground mt-1">Speed reduces: 80 → 60 → 40 → 20 → 0 km/h</p>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Reason for immobilization..." />
              </div>
              <Button onClick={handleCreate} className="w-full" variant="destructive" disabled={!formVehicleId}>
                Confirm & Start Immobilization
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sequences Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Initiated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : sequences.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No immobilization sequences</TableCell></TableRow>
              ) : sequences.map(seq => (
                <>
                  <TableRow key={seq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(seq.id)}>
                    <TableCell>
                      {expandedId === seq.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{getVehicleName(seq.vehicle_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {seq.trigger_type === 'unauthorized_movement' ? <Shield className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {seq.trigger_type === 'unauthorized_movement' ? 'Unauthorized' : 'Geofence'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusColors[seq.sequence_status])}>
                        {seq.sequence_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(seq.speed_steps as number[]).map((speed, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center",
                              i < seq.current_step_index ? "bg-destructive/20 text-destructive" :
                              i === seq.current_step_index && seq.sequence_status === 'in_progress' ? "bg-warning/30 text-warning animate-pulse" :
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {speed}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(seq.initiated_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {(seq.sequence_status === 'pending' || seq.sequence_status === 'in_progress') && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setCancelDialogId(seq.id)}>
                          <Square className="w-3 h-3" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === seq.id && stepsData[seq.id] && (
                    <TableRow key={`${seq.id}-steps`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium mb-2">Speed Reduction Steps</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {stepsData[seq.id].map(step => (
                              <div key={step.id} className={cn("px-3 py-2 rounded-lg text-sm font-medium flex flex-col items-center gap-1", stepStatusColors[step.status])}>
                                <span className="text-lg font-bold">{step.target_speed_kmh}</span>
                                <span className="text-[10px] uppercase">{step.status}</span>
                                {step.scheduled_at && (
                                  <span className="text-[9px] text-muted-foreground">{format(new Date(step.scheduled_at), "HH:mm:ss")}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {seq.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {seq.notes}</p>}
                          {seq.cancel_reason && <p className="text-xs text-destructive mt-1">Cancel reason: {seq.cancel_reason}</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialogId} onOpenChange={open => { if (!open) setCancelDialogId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Immobilization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to cancel this immobilization sequence? The vehicle speed limit will be restored.</p>
            <div>
              <Label>Reason for cancellation</Label>
              <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialogId(null)}>Keep Active</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
                <Unlock className="w-4 h-4 mr-1" /> Cancel Immobilization
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImmobilizationTab;
