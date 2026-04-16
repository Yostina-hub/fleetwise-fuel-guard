import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wrench, AlertTriangle, Clock, Loader2, Eye, Phone, Car } from "lucide-react";
import { useMaintenanceRequests, MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";
import MaintenanceWorkflowProgress from "@/components/maintenance-enterprise/MaintenanceWorkflowProgress";

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

const stageLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  pre_inspection: "Pre-Inspection",
  no_maintenance: "No Maintenance Needed",
  wo_preparation: "WO Being Prepared",
  approved: "Approved",
  rejected: "Rejected",
  vehicle_delivery: "Deliver Vehicle",
  supplier_maintenance: "At Supplier",
  inspector_assigned: "Inspector Assigned",
  post_inspection: "Post-Inspection",
  payment_pending: "Payment Processing",
  delivery_check: "Delivery Check",
  vehicle_received: "Vehicle Received",
  files_updated: "Finalizing",
  completed: "Completed",
  correction_required: "Correction in Progress",
  variation_review: "Variation Under Review",
};

const DriverMaintenanceRequest = () => {
  const { organizationId } = useOrganization();
  const { requests, isLoading, createRequest } = useMaintenanceRequests();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<MaintenanceRequest | null>(null);

  // Get the current driver's assigned vehicle
  const { data: driverInfo } = useQuery({
    queryKey: ["driver-self-info", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Find driver linked to this user
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!driver) return null;

      // 1) Permanent assignment via vehicles.assigned_driver_id (driver may have multiple — pick most recent)
      const { data: permVehicles } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, updated_at")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driver.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      let vehicle = permVehicles?.[0] || null;

      // 2) Fallback: active vehicle request assignment
      if (!vehicle) {
        const { data: req } = await (supabase as any)
          .from("vehicle_requests")
          .select(`assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model)`)
          .eq("organization_id", organizationId)
          .eq("assigned_driver_id", driver.id)
          .in("status", ["assigned", "approved", "in_progress"])
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (req?.assigned_vehicle) vehicle = req.assigned_vehicle;
      }

      return { driver, vehicle };
    },
    enabled: !!organizationId,
  });

  // Filter requests to only show the driver's own
  const myRequests = requests.filter(r =>
    driverInfo?.driver?.id ? r.driver_id === driverInfo.driver.id : false
  );

  const [form, setForm] = useState({
    request_type: "corrective",
    priority: "medium",
    km_reading: "",
    description: "",
    notes: "",
  });

  const handleCreate = async () => {
    if (!driverInfo?.vehicle) {
      toast.error("No vehicle assigned to you");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    await createRequest.mutateAsync({
      vehicle_id: driverInfo.vehicle.id,
      driver_id: driverInfo.driver.id,
      request_type: form.request_type,
      trigger_source: "manual",
      priority: form.priority,
      km_reading: form.km_reading ? Number(form.km_reading) : undefined,
      description: form.description,
      notes: form.notes || undefined,
    });
    setShowCreate(false);
    setForm({ request_type: "corrective", priority: "medium", km_reading: "", description: "", notes: "" });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 slide-in-right">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Wrench className="w-8 h-8 text-warning float-animation" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">
              Maintenance Request
            </h1>
            <p className="text-muted-foreground mt-1">
              Report vehicle issues and track your maintenance requests
            </p>
          </div>
        </div>

        {/* Driver Info & Quick Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-strong">
            <CardContent className="p-4 flex items-center gap-3">
              <Car className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Your Vehicle</p>
                <p className="font-bold text-lg">
                  {driverInfo?.vehicle ? `${driverInfo.vehicle.plate_number}` : "No vehicle assigned"}
                </p>
                {driverInfo?.vehicle && (
                  <p className="text-xs text-muted-foreground">{driverInfo.vehicle.make} {driverInfo.vehicle.model}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Active Requests</p>
                <p className="font-bold text-2xl">
                  {myRequests.filter(r => !["completed", "rejected"].includes(r.status)).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowCreate(true)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">Report an Issue</p>
                <p className="text-xs text-muted-foreground">Create a new maintenance request</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="glass-strong">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="w-4 h-4" /> How the Workflow Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "1. You report an issue",
                "2. Fleet Ops reviews",
                "3. Pre-inspection",
                "4. Work Order created",
                "5. Vehicle goes to supplier",
                "6. Maintenance done",
                "7. Post-inspection",
                "8. Vehicle returned to you",
              ].map((step, i) => (
                <div key={i} className="px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Requests */}
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">My Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No requests yet — click "Report an Issue" to start
                      </TableCell>
                    </TableRow>
                  ) : myRequests.map(req => {
                    const stage = req.workflow_stage || req.status;
                    return (
                      <TableRow key={req.id} className="cursor-pointer" onClick={() => setShowDetail(req)}>
                        <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                        <TableCell className="capitalize">{req.request_type}</TableCell>
                        <TableCell>
                          <Badge variant={req.priority === "critical" || req.priority === "high" ? "destructive" : "outline"} className="capitalize">
                            {req.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{stageLabels[stage] || stage}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[req.status] || "bg-muted text-muted-foreground"} variant="outline">
                            {req.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(req.created_at), "MMM dd")}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog — simplified for drivers */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> Report Vehicle Issue
              </DialogTitle>
              <DialogDescription>
                {driverInfo?.vehicle
                  ? `Reporting for ${driverInfo.vehicle.plate_number} (${driverInfo.vehicle.make} ${driverInfo.vehicle.model})`
                  : "No vehicle assigned — contact Fleet Operations"}
              </DialogDescription>
            </DialogHeader>

            {driverInfo?.vehicle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Type *</Label>
                    <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrective">Something is broken</SelectItem>
                        <SelectItem value="preventive">Scheduled service</SelectItem>
                        <SelectItem value="breakdown">Vehicle won't start/move</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>How urgent?</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Can wait</SelectItem>
                        <SelectItem value="medium">Soon</SelectItem>
                        <SelectItem value="high">Urgent</SelectItem>
                        <SelectItem value="critical">Vehicle unsafe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Current Odometer (km)</Label>
                  <Input
                    type="number"
                    value={form.km_reading}
                    onChange={e => setForm(f => ({ ...f, km_reading: e.target.value }))}
                    placeholder="Enter current km"
                  />
                </div>

                <div>
                  <Label>What's the problem? *</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what's wrong with the vehicle..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Anything else to mention?</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. noise from the engine, warning light on dashboard..."
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createRequest.isPending || !form.description.trim()}>
                    {createRequest.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No vehicle is assigned to you.</p>
                <p className="text-sm">Please contact Fleet Operations to report your issue.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Detail Dialog — driver view (read-only with progress) */}
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request: {showDetail?.request_number}</DialogTitle>
              <DialogDescription>Track the progress of your maintenance request.</DialogDescription>
            </DialogHeader>
            {showDetail && (
              <div className="space-y-4">
                <MaintenanceWorkflowProgress currentStage={(showDetail.workflow_stage || showDetail.status) as any} />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Vehicle:</span> {showDetail.vehicle?.plate_number}</div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{showDetail.request_type}</span></div>
                  <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{showDetail.priority}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[showDetail.status] || ""} variant="outline">{showDetail.status.replace(/_/g, " ")}</Badge></div>
                  <div><span className="text-muted-foreground">KM:</span> {showDetail.km_reading ? Number(showDetail.km_reading).toLocaleString() : "—"}</div>
                  <div><span className="text-muted-foreground">Submitted:</span> {format(new Date(showDetail.created_at), "MMM dd, yyyy HH:mm")}</div>
                </div>

                {showDetail.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="mt-1 p-2 rounded bg-muted/30">{showDetail.description}</p>
                  </div>
                )}

                {showDetail.rejection_reason && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1 text-destructive" />
                    <strong>Rejected:</strong> {showDetail.rejection_reason}
                  </div>
                )}

                {showDetail.supplier_name && (
                  <div className="p-3 rounded bg-primary/10 text-sm">
                    <strong>Supplier:</strong> {showDetail.supplier_name}
                    {showDetail.vehicle_delivered_at && ` — Vehicle delivered ${format(new Date(showDetail.vehicle_delivered_at), "MMM dd")}`}
                  </div>
                )}

                {showDetail.vehicle_received_at && (
                  <div className="p-3 rounded bg-success/10 text-sm">
                    ✓ Vehicle returned: {format(new Date(showDetail.vehicle_received_at), "MMM dd, HH:mm")}
                  </div>
                )}

                {/* Driver action: Deliver vehicle (Step 6b) */}
                {showDetail.workflow_stage === "approved" && (
                  <div className="p-3 rounded border border-warning/20 bg-warning/5 text-sm">
                    <strong>Action Required:</strong> Please deliver your vehicle to the assigned outsourcing garage.
                  </div>
                )}

                {/* Driver action: Receive vehicle (Step 23/27) */}
                {showDetail.workflow_stage === "vehicle_received" && (
                  <div className="p-3 rounded border border-success/20 bg-success/5 text-sm">
                    <strong>Action Required:</strong> Your vehicle is ready for pickup. Please receive and confirm.
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default DriverMaintenanceRequest;
