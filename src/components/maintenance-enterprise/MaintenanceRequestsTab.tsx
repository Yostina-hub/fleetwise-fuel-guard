import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Loader2, Wrench, AlertTriangle, Clock, FileText } from "lucide-react";
import { useMaintenanceRequests, MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useVehicles } from "@/hooks/useVehicles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";
import MaintenanceRequestDetail from "./MaintenanceRequestDetail";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  work_order_created: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const typeIcons: Record<string, typeof Wrench> = {
  preventive: Clock,
  corrective: Wrench,
  breakdown: AlertTriangle,
};

const triggerLabels: Record<string, string> = {
  auto_km: "Auto (KM)",
  auto_hours: "Auto (Hours)",
  auto_date: "Auto (Schedule)",
  manual: "Manual",
};

const stageLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Fleet Review",
  pre_inspection: "Pre-Inspection",
  no_maintenance: "No Maint.",
  wo_preparation: "WO Prep",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  vehicle_delivery: "Vehicle Delivery",
  supplier_maintenance: "At Supplier",
  variation_review: "Variation Review",
  inspector_assigned: "Inspector",
  post_inspection: "Post-Inspection",
  acceptance_review: "Acceptance",
  correction_required: "Correction",
  payment_pending: "Payment",
  delivery_check: "Delivery Check",
  vehicle_received: "Received",
  files_updated: "Files Update",
  completed: "Completed",
};

const MaintenanceRequestsTab = () => {
  const {
    requests, isLoading, createRequest, approveRequest, rejectRequest,
    reviewRequest, submitPreInspection, deliverToSupplier, submitVariation,
    handleVariation, assignInspector, submitPostInspection, submitSupplierDocs,
    checkDelivery, receiveVehicle, completeRequest, sendForCorrection, stats,
  } = useMaintenanceRequests();
  const { vehicles } = useVehicles();
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<MaintenanceRequest | null>(null);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-for-mr", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", request_type: "preventive", priority: "medium",
    km_reading: "", running_hours: "", fuel_level: "", requestor_department: "",
    description: "", requested_completion_date: "", notes: "",
  });

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !searchQuery || r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vehicle?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesType = typeFilter === "all" || r.request_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchQuery, statusFilter, typeFilter]);

  const handleCreate = async () => {
    if (!form.vehicle_id) { toast.error("Vehicle is required"); return; }
    await createRequest.mutateAsync({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || undefined,
      request_type: form.request_type,
      priority: form.priority,
      km_reading: form.km_reading ? Number(form.km_reading) : undefined,
      running_hours: form.running_hours ? Number(form.running_hours) : undefined,
      fuel_level: form.fuel_level ? Number(form.fuel_level) : undefined,
      requestor_department: form.requestor_department || undefined,
      description: form.description || undefined,
      requested_completion_date: form.requested_completion_date || undefined,
      notes: form.notes || undefined,
    });
    setShowCreate(false);
    setForm({ vehicle_id: "", driver_id: "", request_type: "preventive", priority: "medium",
      km_reading: "", running_hours: "", fuel_level: "", requestor_department: "",
      description: "", requested_completion_date: "", notes: "" });
  };

  const handleDetailAction = async (action: string, data?: any) => {
    if (!showDetail) return;
    const id = showDetail.id;
    try {
      switch (action) {
        case "review":
          await reviewRequest.mutateAsync({ id });
          // Move to pre_inspection stage
          await supabase.from("maintenance_requests").update({ workflow_stage: "pre_inspection" }).eq("id", id);
          break;
        case "approve":
          await approveRequest.mutateAsync({ id });
          break;
        case "reject":
          setShowReject(id);
          return;
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
      }
      // Refresh detail
      const { data: updated } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model), driver:drivers(first_name, last_name)")
        .eq("id", id)
        .single();
      if (updated) setShowDetail(updated as unknown as MaintenanceRequest);
    } catch (err) {
      // errors handled by mutation
    }
  };

  const anyPending = reviewRequest.isPending || submitPreInspection.isPending ||
    deliverToSupplier.isPending || submitVariation.isPending || handleVariation.isPending ||
    assignInspector.isPending || submitPostInspection.isPending || submitSupplierDocs.isPending ||
    checkDelivery.isPending || receiveVehicle.isPending || completeRequest.isPending ||
    sendForCorrection.isPending || approveRequest.isPending;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Submitted", value: stats.submitted, color: "text-blue-400" },
          { label: "Approved", value: stats.approved, color: "text-green-400" },
          { label: "Rejected", value: stats.rejected, color: "text-red-400" },
          { label: "In Progress", value: stats.inProgress, color: "text-yellow-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Draft", value: stats.draft, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="glass-strong">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="preventive">Preventive</SelectItem>
            <SelectItem value="corrective">Corrective</SelectItem>
            <SelectItem value="breakdown">Breakdown</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Requests Table */}
      <Card className="glass-strong">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Workflow Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No maintenance requests found</TableCell></TableRow>
                ) : filtered.map(req => {
                  const TypeIcon = typeIcons[req.request_type] || Wrench;
                  const stage = req.workflow_stage || req.status;
                  return (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setShowDetail(req)}>
                      <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className="w-4 h-4" />
                          <span className="capitalize">{req.request_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{req.vehicle?.plate_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={req.priority === "critical" || req.priority === "high" ? "destructive" : "outline"} className="capitalize">
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-xs">{triggerLabels[req.trigger_source] || req.trigger_source}</span></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {stageLabels[stage] || stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[req.status] || ""} variant="outline">
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(req.created_at), "MMM dd, HH:mm")}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setShowDetail(req); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Create Maintenance Request</DialogTitle>
            <DialogDescription>Submit a new maintenance request for fleet operations approval.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request Type *</Label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority *</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={form.driver_id} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>KM Reading</Label>
              <Input type="number" value={form.km_reading} onChange={e => setForm(f => ({ ...f, km_reading: e.target.value }))} placeholder="Current odometer" />
            </div>
            <div>
              <Label>Running Hours</Label>
              <Input type="number" value={form.running_hours} onChange={e => setForm(f => ({ ...f, running_hours: e.target.value }))} placeholder="Engine hours" />
            </div>
            <div>
              <Label>Fuel Level (%)</Label>
              <Input type="number" value={form.fuel_level} onChange={e => setForm(f => ({ ...f, fuel_level: e.target.value }))} placeholder="0-100" />
            </div>
            <div>
              <Label>Requestor Department</Label>
              <Input value={form.requestor_department} onChange={e => setForm(f => ({ ...f, requestor_department: e.target.value }))} placeholder="e.g. Fleet Operations" />
            </div>
            <div>
              <Label>Requested Completion Date</Label>
              <Input type="date" value={form.requested_completion_date} onChange={e => setForm(f => ({ ...f, requested_completion_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the maintenance need..." rows={3} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRequest.isPending}>
              {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with full workflow */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maintenance Request: {showDetail?.request_number}</DialogTitle>
            <DialogDescription>Full workflow view — take actions based on the current stage.</DialogDescription>
          </DialogHeader>
          {showDetail && (
            <MaintenanceRequestDetail
              request={showDetail}
              onAction={handleDetailAction}
              isPending={anyPending}
              drivers={drivers}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this maintenance request.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Rejection reason..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!rejectionReason.trim()) { toast.error("Reason is required"); return; }
              rejectRequest.mutate({ id: showReject!, reason: rejectionReason });
              setShowReject(null);
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceRequestsTab;
