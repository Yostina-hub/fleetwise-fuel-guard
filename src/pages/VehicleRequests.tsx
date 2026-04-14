import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Clock, CheckCircle, XCircle, Truck, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";
import { toast } from "sonner";

import { useTranslation } from 'react-i18next';
const VehicleRequests = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({
    requester_name: "", purpose: "", needed_from: "", needed_until: "", destination: "", priority: "normal", passengers: "", pool_location: "",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["vehicle-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["vehicle-request-approvals", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any).from("vehicle_requests").insert({
        organization_id: organizationId!,
        request_number: `VR-${Date.now().toString(36).toUpperCase()}`,
        requester_id: user?.id,
        requester_name: form.requester_name,
        purpose: form.purpose,
        needed_from: form.needed_from,
        needed_until: form.needed_until || null,
        destination: form.destination || null,
        priority: form.priority,
        passengers: form.passengers ? parseInt(form.passengers) : null,
        pool_location: form.pool_location || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle request created");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      setShowCreate(false);
      setForm({ requester_name: "", purpose: "", needed_from: "", needed_until: "", destination: "", priority: "normal", passengers: "", pool_location: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, vehicle_id }: { id: string; status: string; vehicle_id?: string }) => {
      const updates: any = { status };
      if (status === "assigned" && vehicle_id) {
        updates.assigned_vehicle_id = vehicle_id;
        updates.assigned_at = new Date().toISOString();
      }
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
      const { error } = await (supabase as any).from("vehicle_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      setShowDetail(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    pending: "secondary", approved: "default", assigned: "default", rejected: "destructive", completed: "outline", cancelled: "secondary",
  };

  const pending = requests.filter((r: any) => r.status === "pending").length;
  const assigned = requests.filter((r: any) => r.status === "assigned").length;
  const completed = requests.filter((r: any) => r.status === "completed").length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('pages.vehicle_requests.title', 'Vehicle Requests')}</h1>
              <p className="text-muted-foreground text-xs">{t('pages.vehicle_requests.description', 'Request, approve & assign vehicles')}</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Request
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-500" /></div>
            <div><p className="text-xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Truck className="w-4 h-4 text-blue-500" /></div>
            <div><p className="text-xl font-bold">{assigned}</p><p className="text-xs text-muted-foreground">Assigned</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xl font-bold">{completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">All Requests</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="animate-pulse h-32" /> : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No vehicle requests yet.</p>
                <p className="text-xs mt-1">Create a new request to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Request #</th>
                    <th className="text-left py-2 px-3">Requester</th>
                    <th className="text-left py-2 px-3">Purpose</th>
                    <th className="text-left py-2 px-3">Needed From</th>
                    <th className="text-left py-2 px-3">Vehicle</th>
                    <th className="text-center py-2 px-3">Priority</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-center py-2 px-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{r.request_number}</td>
                        <td className="py-2 px-3">{r.requester_name}</td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{r.purpose}</td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(r.needed_from), "MMM dd, HH:mm")}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.assigned_vehicle?.plate_number || "—"}</td>
                        <td className="py-2 px-3 text-center"><Badge variant="outline" className="text-[10px]">{r.priority}</Badge></td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={(statusColors[r.status] || "secondary") as any} className="text-[10px]">{r.status}</Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button size="sm" variant="ghost" onClick={() => setShowDetail(r)}><Eye className="w-3.5 h-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Request Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Vehicle Request</DialogTitle>
              <DialogDescription>Submit a vehicle request for approval and assignment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Requester Name *</Label><Input value={form.requester_name} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} /></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Purpose *</Label><Textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Describe the purpose..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Needed From *</Label><Input type="datetime-local" value={form.needed_from} onChange={e => setForm(f => ({ ...f, needed_from: e.target.value }))} /></div>
                <div><Label>Needed Until</Label><Input type="datetime-local" value={form.needed_until} onChange={e => setForm(f => ({ ...f, needed_until: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Destination</Label><Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} /></div>
                <div><Label>Passengers</Label><Input type="number" value={form.passengers} onChange={e => setForm(f => ({ ...f, passengers: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.requester_name || !form.purpose || !form.needed_from || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail / Approve / Assign Dialog */}
        {showDetail && (
          <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request {showDetail.request_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Requester:</span> {showDetail.requester_name}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={(statusColors[showDetail.status] || "secondary") as any}>{showDetail.status}</Badge></div>
                  <div><span className="text-muted-foreground">Priority:</span> {showDetail.priority}</div>
                  <div><span className="text-muted-foreground">Needed:</span> {format(new Date(showDetail.needed_from), "MMM dd, HH:mm")}</div>
                </div>
                <div><span className="text-muted-foreground">Purpose:</span> {showDetail.purpose}</div>
                {showDetail.destination && <div><span className="text-muted-foreground">Destination:</span> {showDetail.destination}</div>}
                {showDetail.assigned_vehicle && (
                  <div><span className="text-muted-foreground">Assigned Vehicle:</span> {showDetail.assigned_vehicle.plate_number}</div>
                )}
                {showDetail.assigned_driver && (
                  <div><span className="text-muted-foreground">Assigned Driver:</span> {showDetail.assigned_driver.first_name} {showDetail.assigned_driver.last_name}</div>
                )}

                {/* Approval History */}
                {approvals.filter((a: any) => a.request_id === showDetail.id).length > 0 && (
                  <div className="border-t pt-3">
                    <p className="font-medium mb-2">Approval History</p>
                    {approvals.filter((a: any) => a.request_id === showDetail.id).map((a: any) => (
                      <div key={a.id} className="flex justify-between text-xs py-1">
                        <span>{a.approver_name} — <Badge variant={a.decision === "approved" ? "default" : "destructive"} className="text-[10px]">{a.decision}</Badge></span>
                        <span className="text-muted-foreground">{a.decided_at ? format(new Date(a.decided_at), "MMM dd, HH:mm") : "Pending"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {showDetail.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: showDetail.id, status: "approved" })}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatusMutation.mutate({ id: showDetail.id, status: "rejected" })}>Reject</Button>
                  </>
                )}
                {showDetail.status === "approved" && (
                  <Select onValueChange={v => updateStatusMutation.mutate({ id: showDetail.id, status: "assigned", vehicle_id: v })}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Assign Vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.filter((v: any) => v.status === "active").slice(0, 30).map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showDetail.status === "assigned" && (
                  <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: showDetail.id, status: "completed" })}>Mark Complete</Button>
                )}
                {["pending", "approved"].includes(showDetail.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: showDetail.id, status: "cancelled" })}>Cancel</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default VehicleRequests;
