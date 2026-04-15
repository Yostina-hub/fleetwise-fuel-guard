import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/reports/TablePagination";
import { motion } from "framer-motion";
import { Route, Plus, MapPin, Truck, Clock, Navigation, BarChart3, Loader2, Calendar, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { toast } from "sonner";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

const RoutePlanning = () => {
  const [activeTab, setActiveTab] = useState("plans");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    plan_name: "", origin: "", destination: "", estimated_distance_km: "",
    estimated_duration_minutes: "", planned_date: "", priority: "normal",
    assigned_vehicle_id: "", notes: "",
    waypoints: [""],
  });

  const { data: routePlans = [], isLoading } = useQuery({
    queryKey: ["route-plans", organizationId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("route_plans")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const waypoints = form.waypoints.filter(w => w.trim());
      const { error } = await (supabase as any).from("route_plans").insert({
        organization_id: organizationId!,
        plan_name: form.plan_name,
        origin: form.origin,
        destination: form.destination,
        waypoints: waypoints.length > 0 ? waypoints : [],
        estimated_distance_km: parseFloat(form.estimated_distance_km) || null,
        estimated_duration_minutes: parseInt(form.estimated_duration_minutes) || null,
        planned_date: form.planned_date || null,
        priority: form.priority,
        assigned_vehicle_id: form.assigned_vehicle_id || null,
        notes: form.notes || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Route plan created");
      queryClient.invalidateQueries({ queryKey: ["route-plans"] });
      setShowCreateDialog(false);
      setForm({ plan_name: "", origin: "", destination: "", estimated_distance_km: "", estimated_duration_minutes: "", planned_date: "", priority: "normal", assigned_vehicle_id: "", notes: "", waypoints: [""] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "in_progress") update.actual_departure_time = new Date().toISOString();
      if (status === "completed") update.actual_arrival_time = new Date().toISOString();
      const { error } = await (supabase as any).from("route_plans").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["route-plans"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      scheduled: "bg-blue-500/10 text-blue-500",
      in_progress: "bg-warning/10 text-warning",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
    };
    return <Badge className={map[status] || ""}>{status.replace(/_/g, " ")}</Badge>;
  };

  const getPriorityBadge = (p: string) => {
    const map: Record<string, string> = { high: "bg-destructive/10 text-destructive", normal: "bg-muted text-muted-foreground", low: "bg-muted text-muted-foreground/60" };
    return <Badge variant="outline" className={map[p] || ""}>{p}</Badge>;
  };

  const getVehiclePlate = (id?: string) => {
    if (!id) return "—";
    return vehicles.find(v => v.id === id)?.plate_number || "Unknown";
  };

  const filtered = routePlans;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const draftCount = routePlans.filter((r: any) => r.status === "draft").length;
  const activeCount = routePlans.filter((r: any) => r.status === "in_progress" || r.status === "scheduled").length;
  const completedCount = routePlans.filter((r: any) => r.status === "completed").length;
  const totalDistance = routePlans.reduce((s: number, r: any) => s + (r.estimated_distance_km || 0), 0);

  const addWaypoint = () => setForm({ ...form, waypoints: [...form.waypoints, ""] });
  const updateWaypoint = (i: number, val: string) => {
    const wp = [...form.waypoints];
    wp[i] = val;
    setForm({ ...form, waypoints: wp });
  };
  const removeWaypoint = (i: number) => {
    const wp = form.waypoints.filter((_, idx) => idx !== i);
    setForm({ ...form, waypoints: wp.length ? wp : [""] });
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Navigation className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Route Planning</h1>
            <p className="text-muted-foreground text-xs">Plan, assign, and track vehicle routes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Plans", value: routePlans.length, icon: Route },
            { label: "Draft", value: draftCount, icon: Clock, color: "text-muted-foreground" },
            { label: "Active", value: activeCount, icon: Navigation, color: "text-warning" },
            { label: "Est. Distance", value: `${totalDistance.toLocaleString()} km`, icon: MapPin, color: "text-emerald-500" },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><s.icon className={`w-5 h-5 ${s.color || "text-primary"}`} /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </CardContent></Card>
            </motion.div>
          ))}
        </div>

        {/* Filters + Create */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4" />Create Route Plan</Button>
        </div>

        {/* Route Plans Table */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Route Plans</h3>
            <p>Create your first route plan to get started.</p>
          </CardContent></Card>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Origin → Destination</TableHead>
                  <TableHead>Waypoints</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.plan_name}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" />{r.origin}
                        <span className="text-muted-foreground mx-1">→</span>
                        <MapPin className="w-3 h-3 text-destructive" />{r.destination}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.waypoints && Array.isArray(r.waypoints) && r.waypoints.length > 0 ? (
                        <Badge variant="outline">{r.waypoints.length} stops</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{getVehiclePlate(r.assigned_vehicle_id)}</TableCell>
                    <TableCell>{r.estimated_distance_km ? `${r.estimated_distance_km} km` : "—"}</TableCell>
                    <TableCell>{r.estimated_duration_minutes ? `${r.estimated_duration_minutes} min` : "—"}</TableCell>
                    <TableCell>{r.planned_date ? format(new Date(r.planned_date), "MMM dd") : "—"}</TableCell>
                    <TableCell>{getPriorityBadge(r.priority || "normal")}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "scheduled" })}>Schedule</Button>
                        )}
                        {r.status === "scheduled" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "in_progress" })}>Start</Button>
                        )}
                        {r.status === "in_progress" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 text-success" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "completed" })}>Complete</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          </>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Route Plan</DialogTitle>
              <DialogDescription>Define a new route with origin, destination, and waypoints.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div><Label>Plan Name *</Label><Input value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} placeholder="e.g. Morning Delivery Route" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Origin *</Label><Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Starting location" /></div>
                <div><Label>Destination *</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="End location" /></div>
              </div>

              {/* Waypoints */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Waypoints (Stops)</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addWaypoint}><Plus className="w-3 h-3 mr-1" />Add Stop</Button>
                </div>
                <div className="space-y-2">
                  {form.waypoints.map((wp, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[24px]">{i + 1}.</div>
                      <Input value={wp} onChange={e => updateWaypoint(i, e.target.value)} placeholder={`Stop ${i + 1}`} className="flex-1" />
                      {form.waypoints.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-9 px-2 text-destructive" onClick={() => removeWaypoint(i)}>×</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><Label>Est. Distance (km)</Label><Input type="number" value={form.estimated_distance_km} onChange={e => setForm({ ...form, estimated_distance_km: e.target.value })} /></div>
                <div><Label>Est. Duration (min)</Label><Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm({ ...form, estimated_duration_minutes: e.target.value })} /></div>
                <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Assign Vehicle</Label>
                  <Select value={form.assigned_vehicle_id} onValueChange={v => setForm({ ...form, assigned_vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.plan_name || !form.origin || !form.destination || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RoutePlanning;
