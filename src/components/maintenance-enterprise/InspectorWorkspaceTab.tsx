import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ClipboardCheck, Search, Loader2, Eye, AlertTriangle,
  CheckCircle, FileText, Truck, Package, DollarSign,
} from "lucide-react";
import { useMaintenanceRequests, MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import MaintenanceRequestDetail from "./MaintenanceRequestDetail";
import { useQuery } from "@tanstack/react-query";

// Stages the inspector owns (steps 11–29 of the diagram)
const INSPECTOR_STAGES = [
  "inspector_assigned",   // 11/15 — perform post-inspection
  "payment_pending",      // 16/17 — supplier docs / payment hand-off
  "delivery_check",       // 28    — verify delivery docs
  "vehicle_received",     // 23    — confirm vehicle physically back
  "correction_required",  // 25/26 — send back to supplier
  "files_updated",        // 21    — close-out
] as const;

const STAGE_META: Record<string, { label: string; icon: typeof ClipboardCheck; tone: string; step: string }> = {
  inspector_assigned:   { label: "Post-Inspection", icon: ClipboardCheck, tone: "bg-primary/15 text-primary border-primary/30", step: "15" },
  payment_pending:      { label: "Payment / Docs",  icon: DollarSign,     tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", step: "16-17" },
  delivery_check:       { label: "Delivery Check",  icon: FileText,       tone: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30", step: "28" },
  vehicle_received:     { label: "Vehicle Received",icon: Truck,          tone: "bg-blue-500/15 text-blue-400 border-blue-500/30", step: "23" },
  correction_required:  { label: "Correction Req.", icon: AlertTriangle,  tone: "bg-orange-500/15 text-orange-400 border-orange-500/30", step: "25-26" },
  files_updated:        { label: "Close-out",       icon: Package,        tone: "bg-success/15 text-success border-success/30", step: "20-21" },
};

const InspectorWorkspaceTab = () => {
  const {
    requests, isLoading,
    submitPostInspection, submitSupplierDocs, checkDelivery,
    receiveVehicle, completeRequest, sendForCorrection,
    approveRequest, reviewRequest, submitPreInspection, deliverToSupplier,
    submitVariation, handleVariation, assignInspector,
  } = useMaintenanceRequests();
  const { organizationId } = useOrganization();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [detail, setDetail] = useState<MaintenanceRequest | null>(null);
  const [correctionFor, setCorrectionFor] = useState<string | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState("");

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-inspector-ws", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const inspectorQueue = useMemo(() => {
    return requests.filter(r => INSPECTOR_STAGES.includes((r.workflow_stage || "") as any));
  }, [requests]);

  const filtered = useMemo(() => {
    return inspectorQueue.filter(r => {
      const matchSearch = !search ||
        r.request_number.toLowerCase().includes(search.toLowerCase()) ||
        r.vehicle?.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.supplier_name?.toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === "all" || r.workflow_stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [inspectorQueue, search, stageFilter]);

  // Counters per stage
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    INSPECTOR_STAGES.forEach(s => { c[s] = 0; });
    inspectorQueue.forEach(r => {
      const s = r.workflow_stage as string;
      if (s in c) c[s]++;
    });
    return c;
  }, [inspectorQueue]);

  const refreshDetail = async (id: string) => {
    const { data } = await supabase
      .from("maintenance_requests")
      .select("*, vehicle:vehicles(plate_number, make, model), driver:drivers(first_name, last_name)")
      .eq("id", id)
      .single();
    if (data) setDetail(data as unknown as MaintenanceRequest);
  };

  const handleAction = async (action: string, data?: any) => {
    if (!detail) return;
    const id = detail.id;
    try {
      switch (action) {
        case "post_inspection":
          await submitPostInspection.mutateAsync({ id, result: data.result, notes: data.notes });
          break;
        case "supplier_docs":
          await submitSupplierDocs.mutateAsync({ id });
          break;
        case "delivery_ok":
          await checkDelivery.mutateAsync({ id, acceptable: true });
          break;
        case "delivery_fail":
          await checkDelivery.mutateAsync({ id, acceptable: false });
          break;
        case "receive_vehicle":
          await receiveVehicle.mutateAsync({ id });
          break;
        case "complete":
          await completeRequest.mutateAsync({ id });
          break;
        case "send_correction":
          await sendForCorrection.mutateAsync({ id, notes: data.notes });
          break;
        case "review":
          await reviewRequest.mutateAsync({ id });
          await supabase.from("maintenance_requests").update({ workflow_stage: "pre_inspection" }).eq("id", id);
          break;
        case "approve":
          await approveRequest.mutateAsync({ id });
          break;
        case "pre_inspection":
          await submitPreInspection.mutateAsync({ id, needs_maintenance: data.needs_maintenance, notes: data.notes });
          break;
        case "deliver_supplier":
          await deliverToSupplier.mutateAsync({ id, supplier_name: data.supplier_name });
          break;
        case "submit_variation":
          await submitVariation.mutateAsync({ id, notes: data.notes });
          break;
        case "accept_variation":
          await handleVariation.mutateAsync({ id, accepted: true });
          break;
        case "reject_variation":
          await handleVariation.mutateAsync({ id, accepted: false });
          break;
        case "assign_inspector":
          await assignInspector.mutateAsync({ id, inspector_id: data.inspector_id });
          break;
      }
      await refreshDetail(id);
    } catch {
      // toast shown by mutation
    }
  };

  const handleQuickCorrection = async () => {
    if (!correctionFor || !correctionNotes.trim()) return;
    try {
      await sendForCorrection.mutateAsync({ id: correctionFor, notes: correctionNotes.trim() });
      setCorrectionFor(null);
      setCorrectionNotes("");
    } catch {
      toast.error("Failed to send correction");
    }
  };

  const anyPending =
    submitPostInspection.isPending || submitSupplierDocs.isPending ||
    checkDelivery.isPending || receiveVehicle.isPending ||
    completeRequest.isPending || sendForCorrection.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {INSPECTOR_STAGES.map(stage => {
          const meta = STAGE_META[stage];
          const Icon = meta.icon;
          return (
            <Card
              key={stage}
              className={`glass-strong cursor-pointer transition hover:scale-[1.02] ${stageFilter === stage ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-md border ${meta.tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none">{counts[stage]}</p>
                  <p className="text-xs text-muted-foreground truncate">Step {meta.step} · {meta.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by request #, plate or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All inspector stages</SelectItem>
            {INSPECTOR_STAGES.map(s => (
              <SelectItem key={s} value={s}>{STAGE_META[s].label} (Step {STAGE_META[s].step})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">{filtered.length} in queue</Badge>
      </div>

      {/* Queue table */}
      <Card className="glass-strong">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Inspector queue is empty.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(req => {
                  const stage = req.workflow_stage as string;
                  const meta = STAGE_META[stage];
                  const Icon = meta?.icon || ClipboardCheck;
                  return (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetail(req)}>
                      <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                      <TableCell>{req.vehicle?.plate_number || "—"}</TableCell>
                      <TableCell className="text-sm">{req.supplier_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${meta?.tone || ""}`}>
                          <Icon className="w-3 h-3" />
                          {meta?.label || stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.updated_at), "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {/* Quick send-back */}
                          {(stage === "inspector_assigned" || stage === "delivery_check") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                              onClick={() => { setCorrectionFor(req.id); setCorrectionNotes(""); }}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Send back
                            </Button>
                          )}
                          {/* Quick accept for received */}
                          {stage === "vehicle_received" && req.status !== "completed" && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/80"
                              disabled={anyPending}
                              onClick={async () => {
                                await receiveVehicle.mutateAsync({ id: req.id });
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                            </Button>
                          )}
                          {/* Quick close-out */}
                          {stage === "files_updated" && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/80"
                              disabled={anyPending}
                              onClick={async () => {
                                await completeRequest.mutateAsync({ id: req.id });
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Close
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => setDetail(req)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Inspector Workspace · {detail?.request_number}
            </DialogTitle>
            <DialogDescription>
              Drive the maintenance request through post-inspection, payment, delivery check and close-out.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <MaintenanceRequestDetail
              request={detail}
              onAction={handleAction}
              isPending={anyPending}
              drivers={drivers}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick correction dialog */}
      <Dialog open={!!correctionFor} onOpenChange={open => !open && setCorrectionFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" /> Send back to supplier
            </DialogTitle>
            <DialogDescription>
              Describe what needs correction. The request will return to the supplier maintenance stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Correction notes *</Label>
            <Textarea
              rows={4}
              value={correctionNotes}
              onChange={e => setCorrectionNotes(e.target.value)}
              placeholder="e.g. Brake pad noise persists after road test..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!correctionNotes.trim() || sendForCorrection.isPending}
              onClick={handleQuickCorrection}
            >
              {sendForCorrection.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectorWorkspaceTab;
