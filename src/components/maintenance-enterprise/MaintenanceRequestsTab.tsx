import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, CheckCircle, XCircle, Eye, Loader2, Wrench, AlertTriangle, Clock, Zap, FileText } from "lucide-react";
import { useMaintenanceRequests, MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useVehicles } from "@/hooks/useVehicles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  work_order_created: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground",
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

const MaintenanceRequestsTab = () => {
  const { requests, isLoading, createRequest, approveRequest, rejectRequest, stats } = useMaintenanceRequests();
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
            <SelectItem value="work_order_created">WO Created</SelectItem>
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
                  <TableHead>KM / Hours</TableHead>
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
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className="w-4 h-4" />
                          <span className="capitalize">{req.request_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{req.vehicle?.plate_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={req.priority === "critical" ? "destructive" : req.priority === "high" ? "destructive" : "outline"} className="capitalize">
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="text-xs">{triggerLabels[req.trigger_source] || req.trigger_source}</span></TableCell>
                      <TableCell className="text-sm">{req.km_reading ? `${Number(req.km_reading).toLocaleString()} km` : "—"} {req.running_hours ? `/ ${req.running_hours}h` : ""}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[req.status] || ""} variant="outline">
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(req.created_at), "MMM dd, HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setShowDetail(req)}><Eye className="w-4 h-4" /></Button>
                          {req.status === "submitted" && (
                            <>
                              <Button size="icon" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => approveRequest.mutate({ id: req.id })}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { setShowReject(req.id); setRejectionReason(""); }}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request: {showDetail?.request_number}</DialogTitle>
            <DialogDescription>View maintenance request details and approval status.</DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{showDetail.request_type}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{showDetail.priority}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> {showDetail.vehicle?.plate_number}</div>
                <div><span className="text-muted-foreground">Driver:</span> {showDetail.driver ? `${showDetail.driver.first_name} ${showDetail.driver.last_name}` : "—"}</div>
                <div><span className="text-muted-foreground">KM:</span> {showDetail.km_reading ? Number(showDetail.km_reading).toLocaleString() : "—"}</div>
                <div><span className="text-muted-foreground">Hours:</span> {showDetail.running_hours || "—"}</div>
                <div><span className="text-muted-foreground">Fuel:</span> {showDetail.fuel_level ? `${showDetail.fuel_level}%` : "—"}</div>
                <div><span className="text-muted-foreground">Trigger:</span> {triggerLabels[showDetail.trigger_source]}</div>
              </div>
              <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[showDetail.status]} variant="outline">{showDetail.status.replace(/_/g, " ")}</Badge></div>
              {showDetail.description && <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{showDetail.description}</p></div>}
              {showDetail.rejection_reason && <div className="p-3 rounded bg-red-500/10 border border-red-500/20"><span className="text-red-400 font-medium">Rejection Reason:</span><p className="mt-1">{showDetail.rejection_reason}</p></div>}
              {showDetail.work_order_id && <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/20"><Wrench className="w-4 h-4 inline mr-1 text-cyan-400" /> Work Order linked</div>}
            </div>
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
