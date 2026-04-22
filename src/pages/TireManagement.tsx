import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { CircleDot, Plus, BarChart3, History, AlertTriangle, TrendingUp, RotateCcw, ClipboardList, GitBranch } from "lucide-react";
import { TireChangeDialog } from "@/components/tire-management/TireChangeDialog";
import { TireRequestDialog } from "@/components/tire-management/TireRequestDialog";
import { TireRequestsTab } from "@/components/tire-management/TireRequestsTab";
import { TireUtilizationReport } from "@/components/tire-management/TireUtilizationReport";
import { WorkflowPage } from "@/lib/workflow-engine/WorkflowPage";
import { tireRequestConfig } from "@/lib/workflow-engine/configs/tireRequestConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { toast } from "sonner";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
import { PageDateRangeProvider } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";
const TireManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("workflow");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();

  // Form state
  const [form, setForm] = useState({ brand: "", model: "", size: "", position: "", vehicle_id: "", purchase_cost: "", max_distance_km: "80000" });

  const { data: tireInventory = [], isLoading } = useQuery({
    queryKey: ["tire-inventory", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tire_inventory")
        .select("*, vehicles:current_vehicle_id(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: tireChanges = [] } = useQuery({
    queryKey: ["tire-changes", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tire_changes")
        .select("*, vehicles:vehicle_id(plate_number), tire:tire_id(brand, model)")
        .eq("organization_id", organizationId!)
        .order("change_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addTireMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tire_inventory").insert({
        organization_id: organizationId!,
        brand: form.brand,
        model: form.model || null,
        size: form.size,
        position: form.position || null,
        current_vehicle_id: form.vehicle_id || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        max_distance_km: form.max_distance_km ? parseInt(form.max_distance_km) : null,
        status: "active",
        install_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tire added successfully");
      queryClient.invalidateQueries({ queryKey: ["tire-inventory"] });
      setShowAddDialog(false);
      setForm({ brand: "", model: "", size: "", position: "", vehicle_id: "", purchase_cost: "", max_distance_km: "80000" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addTireRetireMutation = useMutation({
    mutationFn: async (tireId: string) => {
      const { error } = await supabase.from("tire_inventory").update({
        status: "retired",
        retired_date: new Date().toISOString().split("T")[0],
        retired_reason: "manual_retire",
      }).eq("id", tireId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tire retired");
      queryClient.invalidateQueries({ queryKey: ["tire-inventory"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{t('common.active', 'Active')}</Badge>;
      case "warning": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Replace Soon</Badge>;
      case "retired": return <Badge variant="destructive">{t('tires.retired', 'Retired')}</Badge>;
      default: return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const getWearPercent = (km: number | null, max: number | null) => {
    if (!km || !max || max === 0) return 0;
    return Math.min(100, Math.round((km / max) * 100));
  };

  const activeTires = tireInventory.filter((t: any) => t.status === "active");
  const warningTires = tireInventory.filter((t: any) => t.status === "warning" || (t.total_distance_km && t.max_distance_km && t.total_distance_km / t.max_distance_km > 0.9));
  const totalCost = tireInventory.reduce((s: number, t: any) => s + (t.purchase_cost || 0), 0);

  return (
    <Layout>
      <PageDateRangeProvider>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <CircleDot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('pages.tire_management.title', 'Tire Management')}</h1>
              <p className="text-muted-foreground text-xs">{t('pages.tire_management.description', 'Track tire inventory, wear, replacements & costs')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => setShowRequestDialog(true)}>
              <ClipboardList className="w-4 h-4" /> New Tire Request
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setShowChangeDialog(true)}>
              <RotateCcw className="w-4 h-4" /> Record Change
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" /> Add Tire
            </Button>
          </div>
        </div>

        {/* Page-level date range filter */}
        <PageDateRangeFilter />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Tires", value: tireInventory.length, icon: CircleDot, color: "text-primary" },
            { label: "Active", value: activeTires.length, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Replace Soon", value: warningTires.length, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Retired", value: tireInventory.filter((t: any) => t.status === "retired").length, icon: AlertTriangle, color: "text-destructive" },
            { label: "Total Cost", value: `${totalCost.toLocaleString()} ETB`, icon: BarChart3, color: "text-primary" },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="workflow" className="gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Workflow</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Requests</TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5"><CircleDot className="w-3.5 h-3.5" /> Inventory</TabsTrigger>
            <TabsTrigger value="utilization" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Utilization</TabsTrigger>
            <TabsTrigger value="positions" className="gap-1.5"><CircleDot className="w-3.5 h-3.5" /> Positions</TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5"><History className="w-3.5 h-3.5" /> Change History</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Cost Analysis</TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="inventory" className="mt-0 space-y-3">
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
              ) : tireInventory.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <CircleDot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tires registered yet.</p>
                  <p className="text-xs mt-1">Click "Add Tire" to start tracking your fleet's tire inventory.</p>
                </CardContent></Card>
              ) : (
                tireInventory.map((tire: any) => {
                  const wear = getWearPercent(tire.total_distance_km, tire.max_distance_km);
                  return (
                    <Card key={tire.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{tire.brand} {tire.model || ""}</span>
                              {getStatusBadge(tire.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {(tire as any).vehicles?.plate_number || "Unassigned"} • {tire.position || "N/A"} • {tire.size}
                            </p>
                            {tire.serial_number && <p className="text-xs text-muted-foreground">S/N: {tire.serial_number}</p>}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm font-medium">{(tire.total_distance_km || 0).toLocaleString()} / {(tire.max_distance_km || 0).toLocaleString()} km</p>
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${wear > 90 ? "bg-destructive" : wear > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${wear}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{wear}% worn • {tire.purchase_cost ? `${tire.purchase_cost} ETB` : "—"}</p>
                            {tire.status === "active" && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive px-2 mt-1" onClick={() => addTireRetireMutation.mutate(tire.id)}>
                                Retire
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-0">
              <TireRequestsTab />
            </TabsContent>

            <TabsContent value="workflow" className="mt-0">
              <WorkflowPage config={tireRequestConfig} />
            </TabsContent>

            <TabsContent value="utilization" className="mt-0">
              <TireUtilizationReport />
            </TabsContent>

            <TabsContent value="positions" className="mt-0">
              {(() => {
                const vehicleMap: Record<string, { plate: string; tires: any[] }> = {};
                tireInventory.filter((t: any) => t.current_vehicle_id && t.status === "active").forEach((tire: any) => {
                  const vid = tire.current_vehicle_id;
                  if (!vehicleMap[vid]) vehicleMap[vid] = { plate: (tire as any).vehicles?.plate_number || "Unknown", tires: [] };
                  vehicleMap[vid].tires.push(tire);
                });
                const vehicleEntries = Object.entries(vehicleMap);
                if (vehicleEntries.length === 0) return (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <CircleDot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No tires assigned to vehicles yet.</p>
                  </CardContent></Card>
                );
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicleEntries.map(([vid, { plate, tires }]) => (
                      <Card key={vid}>
                        <CardHeader className="pb-2"><CardTitle className="text-base">{plate}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="relative mx-auto w-48">
                            <div className="border-2 border-muted rounded-2xl px-4 py-6 space-y-4">
                              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">Front</p>
                              <div className="flex justify-between">
                                {["Front Left", "Front Right"].map(pos => {
                                  const tire = tires.find((t: any) => t.position === pos);
                                  const wear = tire ? getWearPercent(tire.total_distance_km, tire.max_distance_km) : 0;
                                  return (
                                    <div key={pos} className={`w-14 h-8 rounded border-2 flex items-center justify-center text-[9px] font-bold ${tire ? (wear > 90 ? "border-destructive bg-destructive/10 text-destructive" : wear > 75 ? "border-warning bg-warning/10 text-warning" : "border-success bg-success/10 text-success") : "border-dashed border-muted-foreground/30 text-muted-foreground"}`}>
                                      {tire ? `${wear}%` : "—"}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between">
                                {["Rear Left Outer", "Rear Right Outer"].map(pos => {
                                  const tire = tires.find((t: any) => t.position === pos);
                                  const wear = tire ? getWearPercent(tire.total_distance_km, tire.max_distance_km) : 0;
                                  return (
                                    <div key={pos} className={`w-14 h-8 rounded border-2 flex items-center justify-center text-[9px] font-bold ${tire ? (wear > 90 ? "border-destructive bg-destructive/10 text-destructive" : wear > 75 ? "border-warning bg-warning/10 text-warning" : "border-success bg-success/10 text-success") : "border-dashed border-muted-foreground/30 text-muted-foreground"}`}>
                                      {tire ? `${wear}%` : "—"}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">Rear</p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            {tires.map((tire: any) => {
                              const costPerKm = tire.total_distance_km && tire.purchase_cost ? (tire.purchase_cost / tire.total_distance_km).toFixed(2) : "—";
                              return (
                                <div key={tire.id} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{tire.position || "?"}: {tire.brand}</span>
                                  <span className="font-mono">{costPerKm} ETB/km</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="changes" className="mt-0 space-y-3">
              {tireChanges.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tire changes recorded.</p>
                </CardContent></Card>
              ) : (
                tireChanges.map((change: any) => (
                  <Card key={change.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{(change as any).vehicles?.plate_number || "—"} — {change.position}</p>
                          <p className="text-sm text-muted-foreground">
                            {(change as any).tire?.brand} {(change as any).tire?.model} • {change.change_type || "replacement"}
                          </p>
                          <p className="text-xs text-muted-foreground">Reason: {change.reason || "—"} • By: {change.performed_by || "—"}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-medium">{change.cost ? `${change.cost} ETB` : "—"}</p>
                          <p className="text-xs text-muted-foreground">@ {(change.odometer_km || 0).toLocaleString()} km</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(change.change_date), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="costs" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">Tire Cost Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                      <p className="text-3xl font-bold">{totalCost.toLocaleString()} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Avg Cost Per Tire</p>
                      <p className="text-3xl font-bold">{tireInventory.length > 0 ? Math.round(totalCost / tireInventory.length).toLocaleString() : 0} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Changes This Quarter</p>
                      <p className="text-3xl font-bold">{tireChanges.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tire to Inventory</DialogTitle>
              <DialogDescription>Register a new tire installation on a vehicle.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Brand *</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Michelin" /></div>
                <div><Label>{t('vehicles.model', 'Model')}</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. X Multi D" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Size *</Label><Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="e.g. 315/80R22.5" /></div>
                <div><Label>{t('tires.position', 'Position')}</Label>
                  <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {["Front Left", "Front Right", "Rear Left Inner", "Rear Left Outer", "Rear Right Inner", "Rear Right Outer", "Spare"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('common.vehicle', 'Vehicle')}</Label>
                  <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.slice(0, 50).map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Cost (ETB)</Label><Input type="number" value={form.purchase_cost} onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))} placeholder="0.00" /></div>
              </div>
              <div><Label>Max KM Life</Label><Input type="number" value={form.max_distance_km} onChange={e => setForm(f => ({ ...f, max_distance_km: e.target.value }))} placeholder="80000" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => addTireMutation.mutate()} disabled={!form.brand || !form.size || addTireMutation.isPending}>
                {addTireMutation.isPending ? "Adding..." : "Add Tire"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <TireChangeDialog open={showChangeDialog} onOpenChange={setShowChangeDialog} tires={tireInventory} />
        <TireRequestDialog open={showRequestDialog} onOpenChange={setShowRequestDialog} />
      </div>
    </Layout>
  );
};

export default TireManagement;
