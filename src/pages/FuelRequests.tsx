import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Fuel, CheckCircle, Clock, XCircle, Search, Plus, Loader2, Eye, Check, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useTranslation } from "react-i18next";

const ITEMS_PER_PAGE = 15;

const FuelRequestsTable = ({ data, isLoading, getPlate, getDriverName, formatFuel, formatCurrency, statusBadge, setShowDetail, setShowApprove, setShowReject, setApprovedLiters, fulfillMutation }: any) => {
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(data.length, ITEMS_PER_PAGE);
  const paged = data.slice(startIndex, endIndex);

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No fuel requests found</TableCell></TableRow>
              ) : (
                paged.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell>{getPlate(r.vehicle_id)}</TableCell>
                    <TableCell>{getDriverName(r.driver_id)}</TableCell>
                    <TableCell className="capitalize">{r.fuel_type}</TableCell>
                    <TableCell>{formatFuel(r.liters_requested)}</TableCell>
                    <TableCell>{r.liters_approved ? formatFuel(r.liters_approved) : "—"}</TableCell>
                    <TableCell>{r.estimated_cost ? formatCurrency(r.estimated_cost) : "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-sm">{format(new Date(r.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setShowDetail(r)}><Eye className="w-4 h-4" /></Button>
                          </TooltipTrigger><TooltipContent>View details</TooltipContent></Tooltip>
                        </TooltipProvider>
                        {r.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-success" onClick={() => { setShowApprove(r); setApprovedLiters(String(r.liters_requested)); }}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowReject(r)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => fulfillMutation.mutate(r.id)}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <TablePagination currentPage={currentPage} totalItems={data.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
    </>
  );
};

const APPROVER_ROLES = ["fleet_manager", "operations_manager", "org_admin", "super_admin", "fleet_owner"];

const FuelRequests = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { formatCurrency, formatFuel, settings } = useOrganizationSettings();
  const { hasRole } = useAuthContext();
  const canApprove = APPROVER_ROLES.some(r => hasRole(r));
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showApprove, setShowApprove] = useState<any>(null);
  const [showReject, setShowReject] = useState<any>(null);

  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    fuel_type: "diesel",
    liters_requested: "",
    estimated_cost: "",
    purpose: "",
    current_odometer: "",
    notes: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [approvedLiters, setApprovedLiters] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["fuel-requests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("fuel_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getPlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "—";
  const getDriverName = (id?: string | null) => {
    if (!id) return "—";
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const liters = parseFloat(form.liters_requested);
      if (!form.vehicle_id || isNaN(liters) || liters <= 0) throw new Error("Vehicle and liters are required");

      const reqNum = `FR-${Date.now().toString(36).toUpperCase()}`;
      const { data: user } = await supabase.auth.getUser();

      const { data: inserted, error } = await supabase.from("fuel_requests").insert({
        organization_id: organizationId,
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
        requested_by: user.user?.id,
        request_number: reqNum,
        fuel_type: form.fuel_type,
        liters_requested: liters,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        purpose: form.purpose || null,
        current_odometer: form.current_odometer ? parseFloat(form.current_odometer) : null,
        notes: form.notes || null,
        status: "pending",
      }).select("id").single();
      if (error) throw error;

      // Route to approval workflow
      if (inserted?.id) {
        await supabase.rpc("route_fuel_request_approval", { p_fuel_request_id: inserted.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowCreate(false);
      setForm({ vehicle_id: "", driver_id: "", fuel_type: "diesel", liters_requested: "", estimated_cost: "", purpose: "", current_odometer: "", notes: "" });
      toast.success("Fuel request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, liters }: { id: string; liters: number }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("fuel_requests").update({
        status: "approved",
        liters_approved: liters,
        approved_by: user.user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowApprove(null);
      toast.success("Request approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("fuel_requests").update({
        status: "rejected",
        rejected_reason: reason,
        approved_by: user.user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      setShowReject(null);
      setRejectReason("");
      toast.success("Request rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fulfillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_requests").update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-requests"] });
      toast.success("Request marked as fulfilled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { variant: any; className: string }> = {
      pending: { variant: "outline", className: "text-warning border-warning/30" },
      approved: { variant: "outline", className: "bg-success/10 text-success border-success/30" },
      fulfilled: { variant: "secondary", className: "" },
      rejected: { variant: "destructive", className: "" },
    };
    const c = map[s] || { variant: "outline", className: "" };
    return <Badge variant={c.variant} className={c.className}>{s}</Badge>;
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "pending").length,
    approved: requests.filter((r: any) => r.status === "approved").length,
    totalLiters: requests.filter((r: any) => r.status === "fulfilled").reduce((s: number, r: any) => s + (r.liters_approved || 0), 0),
  };

  const filtered = requests.filter((r: any) =>
    !search || r.request_number?.toLowerCase().includes(search.toLowerCase()) ||
    getPlate(r.vehicle_id)?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["Request #", "Vehicle", "Driver", "Fuel Type", "Liters Requested", "Liters Approved", "Est. Cost", "Status", "Purpose", "Date"];
    const rows = filtered.map((r: any) => [
      r.request_number, getPlate(r.vehicle_id), getDriverName(r.driver_id),
      r.fuel_type, r.liters_requested, r.liters_approved || "", r.estimated_cost || "",
      r.status, r.purpose || "", format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fuel-requests-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const tableProps = { isLoading, getPlate, getDriverName, formatFuel, formatCurrency, statusBadge, setShowDetail, setShowApprove, setShowReject, setApprovedLiters, fulfillMutation };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Fuel Request & Clearance</h1>
            <p className="text-muted-foreground">Manage fuel request approvals and dispensing workflows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}><Download className="w-4 h-4" />Export</Button>
            <Button className="gap-2" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Request</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Fuel className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Requests</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-sm text-muted-foreground">Pending Approval</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{stats.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Fuel className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{formatFuel(stats.totalLiters)}</p><p className="text-sm text-muted-foreground">Dispensed</p></div></div></CardContent></Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by request # or plate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          {["all", "pending", "approved", "fulfilled", "rejected"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <FuelRequestsTable data={tab === "all" ? filtered : filtered.filter((r: any) => r.status === tab)} {...tableProps} />
            </TabsContent>
          ))}
        </Tabs>

        {/* Create Request Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Fuel Request</DialogTitle>
              <DialogDescription>Submit a fuel clearance request for approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label>Vehicle *</Label>
                <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                  <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Liters Requested *</Label>
                  <Input type="number" step="0.1" value={form.liters_requested} onChange={e => setForm(f => ({ ...f, liters_requested: e.target.value }))} placeholder="0.0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Cost ({settings.currency})</Label>
                  <Input type="number" step="0.01" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
                </div>
                <div>
                  <Label>Current Odometer</Label>
                  <Input type="number" value={form.current_odometer} onChange={e => setForm(f => ({ ...f, current_odometer: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Daily operations, Long haul trip" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.vehicle_id || !form.liters_requested}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={!!showApprove} onOpenChange={() => setShowApprove(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Fuel Request</DialogTitle>
              <DialogDescription>Review and approve {showApprove?.request_number}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{showApprove && getPlate(showApprove.vehicle_id)}</span></div>
                <div><span className="text-muted-foreground">Requested:</span> <span className="font-medium">{showApprove && formatFuel(showApprove.liters_requested)}</span></div>
              </div>
              <div>
                <Label>Liters to Approve</Label>
                <Input type="number" step="0.1" value={approvedLiters} onChange={e => setApprovedLiters(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprove(null)}>Cancel</Button>
              <Button onClick={() => approveMutation.mutate({ id: showApprove.id, liters: parseFloat(approvedLiters) })} disabled={approveMutation.isPending}>
                {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Fuel Request</DialogTitle>
              <DialogDescription>Reject {showReject?.request_number}</DialogDescription>
            </DialogHeader>
            <div>
              <Label>Reason for Rejection *</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this request is rejected..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReject(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: showReject.id, reason: rejectReason })} disabled={rejectMutation.isPending || !rejectReason.trim()}>
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Request Details — {showDetail?.request_number}</DialogTitle></DialogHeader>
            {showDetail && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground block">Vehicle</span><span className="font-medium">{getPlate(showDetail.vehicle_id)}</span></div>
                  <div><span className="text-muted-foreground block">Driver</span><span className="font-medium">{getDriverName(showDetail.driver_id)}</span></div>
                  <div><span className="text-muted-foreground block">Fuel Type</span><span className="font-medium capitalize">{showDetail.fuel_type}</span></div>
                  <div><span className="text-muted-foreground block">Status</span>{statusBadge(showDetail.status)}</div>
                  <div><span className="text-muted-foreground block">Liters Requested</span><span className="font-medium">{formatFuel(showDetail.liters_requested)}</span></div>
                  <div><span className="text-muted-foreground block">Liters Approved</span><span className="font-medium">{showDetail.liters_approved ? formatFuel(showDetail.liters_approved) : "—"}</span></div>
                  <div><span className="text-muted-foreground block">Estimated Cost</span><span className="font-medium">{showDetail.estimated_cost ? formatCurrency(showDetail.estimated_cost) : "—"}</span></div>
                  <div><span className="text-muted-foreground block">Odometer</span><span className="font-medium">{showDetail.current_odometer || "—"}</span></div>
                  <div><span className="text-muted-foreground block">Requested At</span><span className="font-medium">{format(new Date(showDetail.requested_at), "MMM dd, yyyy HH:mm")}</span></div>
                  {showDetail.approved_at && <div><span className="text-muted-foreground block">Approved At</span><span className="font-medium">{format(new Date(showDetail.approved_at), "MMM dd, yyyy HH:mm")}</span></div>}
                  {showDetail.fulfilled_at && <div><span className="text-muted-foreground block">Fulfilled At</span><span className="font-medium">{format(new Date(showDetail.fulfilled_at), "MMM dd, yyyy HH:mm")}</span></div>}
                </div>
                {showDetail.purpose && <div><span className="text-muted-foreground block">Purpose</span><p>{showDetail.purpose}</p></div>}
                {showDetail.rejected_reason && <div><span className="text-muted-foreground block">Rejection Reason</span><p className="text-destructive">{showDetail.rejected_reason}</p></div>}
                {showDetail.notes && <div><span className="text-muted-foreground block">Notes</span><p>{showDetail.notes}</p></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FuelRequests;
