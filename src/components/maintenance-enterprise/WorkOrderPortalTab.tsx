import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Wrench, Users, Building2, Clock, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const WorkOrderPortalTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [portalView, setPortalView] = useState<"internal" | "external">("internal");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    access_name: "", access_email: "", access_role: "technician",
    portal_type: "internal",
  });

  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ["wo-portal-access", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("work_order_portal_access")
        .select("*, work_order:work_orders(work_order_number, status, service_description), supplier:supplier_profiles(company_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["work-orders-for-portal", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, work_order_number, status, service_description")
        .eq("organization_id", organizationId)
        .in("status", ["pending", "in_progress", "approved"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [selectedWorkOrder, setSelectedWorkOrder] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !selectedWorkOrder) throw new Error("Missing data");
      const { error } = await supabase.from("work_order_portal_access").insert({
        organization_id: organizationId,
        work_order_id: selectedWorkOrder,
        portal_type: form.portal_type,
        access_name: form.access_name,
        access_email: form.access_email,
        access_role: form.access_role,
        permissions: {
          view: true,
          update_status: form.access_role !== "viewer",
          upload_files: form.access_role !== "viewer",
          log_time: form.portal_type === "internal",
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wo-portal-access"] });
      setCreateOpen(false);
      toast.success("Portal access granted");
    },
    onError: () => toast.error("Failed to grant access"),
  });

  const internalAccess = accesses.filter((a: any) => a.portal_type === "internal");
  const externalAccess = accesses.filter((a: any) => a.portal_type === "external");
  const currentList = portalView === "internal" ? internalAccess : externalAccess;

  const filtered = currentList.filter((a: any) =>
    !searchQuery || a.access_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.access_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{accesses.length}</p>
          <p className="text-xs text-muted-foreground">Total Access</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{internalAccess.length}</p>
          <p className="text-xs text-muted-foreground">Internal (Techs)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{externalAccess.length}</p>
          <p className="text-xs text-muted-foreground">External (Suppliers)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{accesses.filter((a: any) => a.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
      </div>

      {/* Portal Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={portalView === "internal" ? "default" : "outline"} className="gap-2" onClick={() => setPortalView("internal")}>
          <Users className="w-4 h-4" /> Internal Technicians
        </Button>
        <Button variant={portalView === "external" ? "default" : "outline"} className="gap-2" onClick={() => setPortalView("external")}>
          <Building2 className="w-4 h-4" /> External Suppliers
        </Button>
        <div className="flex-1" />
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Grant Access</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Grant Portal Access</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Work Order</Label>
                <Select value={selectedWorkOrder} onValueChange={setSelectedWorkOrder}>
                  <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                  <SelectContent>
                    {workOrders.map((wo: any) => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number} — {wo.service_description?.slice(0, 40)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Portal Type</Label>
                <Select value={form.portal_type} onValueChange={v => setForm(f => ({ ...f, portal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (Technician)</SelectItem>
                    <SelectItem value="external">External (Supplier)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={form.access_name} onChange={e => setForm(f => ({ ...f, access_name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.access_email} onChange={e => setForm(f => ({ ...f, access_email: e.target.value }))} /></div>
              <div><Label>Role</Label>
                <Select value={form.access_role} onValueChange={v => setForm(f => ({ ...f, access_role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="lead_tech">Lead Technician</SelectItem>
                    <SelectItem value="supplier_rep">Supplier Rep</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.access_name || !selectedWorkOrder || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Granting..." : "Grant Access"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Access List */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {filtered.map((access: any) => {
            const permissions = access.permissions as Record<string, boolean> || {};
            return (
              <Card key={access.id} className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {access.portal_type === "internal" ? <Users className="w-5 h-5 text-blue-400 shrink-0" /> : <Building2 className="w-5 h-5 text-purple-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{access.access_name}</p>
                          <Badge variant="outline" className="text-[10px]">{access.access_role}</Badge>
                        </div>
                        {access.access_email && <p className="text-xs text-muted-foreground">{access.access_email}</p>}
                        <p className="text-xs text-muted-foreground">
                          WO: {(access.work_order as any)?.work_order_number || "—"}
                          {(access.supplier as any)?.company_name && ` • ${(access.supplier as any).company_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex gap-1">
                        {permissions.view && <Badge variant="outline" className="text-[9px]">View</Badge>}
                        {permissions.update_status && <Badge variant="outline" className="text-[9px]">Update</Badge>}
                        {permissions.upload_files && <Badge variant="outline" className="text-[9px]">Upload</Badge>}
                        {permissions.log_time && <Badge variant="outline" className="text-[9px]">Time</Badge>}
                      </div>
                      {access.time_logged_minutes > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.round(access.time_logged_minutes / 60)}h
                        </span>
                      )}
                      <Badge variant={access.is_active ? "default" : "secondary"} className="text-[10px]">
                        {access.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No portal access entries found</p>}
        </div>
      )}
    </div>
  );
};

export default WorkOrderPortalTab;
