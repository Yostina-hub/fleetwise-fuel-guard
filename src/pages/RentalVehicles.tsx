import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { Truck, Plus, Building2, UserCheck, BarChart3, Clock, Edit, Trash2, Search, XCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

const emptyForm = { plate_number: "", make: "", model: "", provider_name: "", contract_number: "", contract_start: "", contract_end: "", monthly_cost: "", daily_rate: "", driver_name: "", driver_phone: "", driver_type: "own", notes: "" };

const RentalVehicles = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("vehicles");
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: rentalVehicles = [], isLoading } = useQuery({
    queryKey: ["rental-vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_vehicles")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rental-vehicles"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const plate = form.plate_number.trim();
      const provider = form.provider_name.trim();
      if (!plate || !provider) throw new Error("Plate number and provider are required");
      if (form.contract_start >= form.contract_end) throw new Error("Contract end must be after start date");
      const payload = {
        organization_id: organizationId!,
        plate_number: plate,
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        provider_name: provider,
        contract_number: form.contract_number.trim() || null,
        contract_start: form.contract_start,
        contract_end: form.contract_end,
        monthly_cost: form.monthly_cost ? parseFloat(form.monthly_cost) : 0,
        daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null,
        driver_name: form.driver_name.trim() || null,
        driver_phone: form.driver_phone.trim() || null,
        driver_type: form.driver_type,
        notes: form.notes.trim() || null,
      };
      if (editingVehicle) {
        const { organization_id: _, ...updatePayload } = payload;
        const { error } = await supabase.from("rental_vehicles").update(updatePayload).eq("id", editingVehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rental_vehicles").insert({ ...payload, status: "active" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingVehicle ? "Vehicle updated" : "Rental vehicle added");
      invalidate();
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rental_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setShowDeleteConfirm(null); toast.success("Vehicle deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("rental_vehicles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
  });

  const openEdit = (v: any) => {
    setEditingVehicle(v);
    setForm({
      plate_number: v.plate_number || "",
      make: v.make || "",
      model: v.model || "",
      provider_name: v.provider_name || "",
      contract_number: v.contract_number || "",
      contract_start: v.contract_start || "",
      contract_end: v.contract_end || "",
      monthly_cost: v.monthly_cost?.toString() || "",
      daily_rate: v.daily_rate?.toString() || "",
      driver_name: v.driver_name || "",
      driver_phone: v.driver_phone || "",
      driver_type: v.driver_type || "own",
      notes: v.notes || "",
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingVehicle(null);
    setForm(emptyForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case "expiring_soon": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expiring Soon</Badge>;
      case "expired": return <Badge variant="destructive">Expired</Badge>;
      case "terminated": return <Badge variant="secondary">Terminated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeVehicles = rentalVehicles.filter((v: any) => v.status === "active");
  const expiringVehicles = rentalVehicles.filter((v: any) => v.status === "expiring_soon");
  const thirdPartyDrivers = rentalVehicles.filter((v: any) => v.driver_type === "third_party");
  const monthlyCost = rentalVehicles.filter((v: any) => !["expired", "terminated"].includes(v.status)).reduce((s: number, v: any) => s + (v.monthly_cost || 0), 0);

  const providers: Record<string, any[]> = {};
  rentalVehicles.forEach((v: any) => {
    if (!providers[v.provider_name]) providers[v.provider_name] = [];
    providers[v.provider_name].push(v);
  });

  const filtered = useMemo(() => {
    if (!search) return rentalVehicles;
    const s = search.toLowerCase();
    return rentalVehicles.filter((v: any) =>
      v.plate_number?.toLowerCase().includes(s) ||
      v.provider_name?.toLowerCase().includes(s) ||
      v.driver_name?.toLowerCase().includes(s) ||
      v.make?.toLowerCase().includes(s) ||
      v.model?.toLowerCase().includes(s)
    );
  }, [rentalVehicles, search]);

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('pages.rental_vehicles.title', 'Rental & Outsource Vehicles')}</h1>
              <p className="text-muted-foreground text-xs">{t('pages.rental_vehicles.description', 'Manage rental contracts, third-party drivers & costs')}</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => { setForm(emptyForm); setEditingVehicle(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Rental Vehicle
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Rentals", value: rentalVehicles.length, icon: Truck },
            { label: "Active", value: activeVehicles.length, icon: UserCheck, color: "text-emerald-600" },
            { label: "Expiring Soon", value: expiringVehicles.length, icon: Clock, color: "text-amber-600" },
            { label: "3rd Party Drivers", value: thirdPartyDrivers.length, icon: UserCheck },
            { label: "Monthly Cost", value: `${monthlyCost.toLocaleString()} ETB`, icon: BarChart3, color: "text-primary" },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color || "text-muted-foreground"}`} />
              <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-lg font-bold">{stat.value}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search plate, provider, driver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="vehicles" className="gap-1.5"><Truck className="w-3.5 h-3.5" /> Vehicles</TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Contracts</TabsTrigger>
            <TabsTrigger value="providers" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Providers</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Cost Analysis</TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="vehicles" className="mt-0">
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
              ) : filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No rental vehicles found.</p>
                </CardContent></Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plate</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Contract</TableHead>
                          <TableHead>Cost/mo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-semibold">{v.plate_number}</TableCell>
                            <TableCell className="text-sm">{v.make} {v.model}</TableCell>
                            <TableCell>{v.provider_name}</TableCell>
                            <TableCell>
                              <div className="text-sm">{v.driver_name || "—"}</div>
                              {v.driver_type === "third_party" && <Badge variant="outline" className="text-xs">3rd Party</Badge>}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(v.contract_start), "MMM dd")} - {format(new Date(v.contract_end), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">{v.monthly_cost?.toLocaleString()} ETB</TableCell>
                            <TableCell>{getStatusBadge(v.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(v)} title="Edit"><Edit className="w-4 h-4" /></Button>
                                {v.status === "active" && (
                                  <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: v.id, status: "terminated" })} title="Terminate" className="text-destructive hover:text-destructive">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {(v.status === "terminated" || v.status === "expired") && (
                                  <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: v.id, status: "active" })} title="Reactivate">
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(v.id)} className="text-destructive hover:text-destructive" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="mt-0 space-y-3">
              {filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No contracts to display.</CardContent></Card>
              ) : (
                filtered.sort((a: any, b: any) => new Date(a.contract_end).getTime() - new Date(b.contract_end).getTime()).map((v: any) => {
                  const daysLeft = Math.ceil((new Date(v.contract_end).getTime() - Date.now()) / 86400000);
                  const isExpired = daysLeft < 0;
                  const isExpiring = daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <Card key={v.id} className={isExpired ? "border-destructive/50" : isExpiring ? "border-warning/50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{v.plate_number}</span>
                              <Badge variant="outline">{v.provider_name}</Badge>
                              {v.contract_number && <span className="text-xs text-muted-foreground">#{v.contract_number}</span>}
                              {isExpired && <Badge variant="destructive">Expired</Badge>}
                              {isExpiring && <Badge className="bg-warning/10 text-warning">{daysLeft}d left</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(v.contract_start), "MMM dd, yyyy")} → {format(new Date(v.contract_end), "MMM dd, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">Driver: {v.driver_name || "N/A"} ({v.driver_type || "own"})</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold">{v.monthly_cost?.toLocaleString()} ETB/mo</p>
                            {v.daily_rate && <p className="text-xs text-muted-foreground">{v.daily_rate} ETB/day</p>}
                            <p className="text-xs text-muted-foreground">
                              Total: {v.monthly_cost ? (v.monthly_cost * Math.max(1, Math.ceil((new Date(v.contract_end).getTime() - new Date(v.contract_start).getTime()) / (30 * 86400000)))).toLocaleString() : "—"} ETB
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              {Object.keys(providers).length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No providers yet.</CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(providers).map(([name, pvehicles]) => (
                    <Card key={name}>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> {name}</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{pvehicles.length} vehicle(s)</p>
                        <p className="text-sm">Active: {pvehicles.filter((v: any) => v.status === "active").length}</p>
                        <p className="text-sm font-medium">Monthly: {pvehicles.filter((v: any) => !["expired", "terminated"].includes(v.status)).reduce((s: number, v: any) => s + (v.monthly_cost || 0), 0).toLocaleString()} ETB</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="costs" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">Rental Cost Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monthly Rental Cost</p>
                      <p className="text-3xl font-bold">{monthlyCost.toLocaleString()} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Annual Projection</p>
                      <p className="text-3xl font-bold">{(monthlyCost * 12).toLocaleString()} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Avg Cost / Vehicle</p>
                      <p className="text-3xl font-bold">{activeVehicles.length > 0 ? Math.round(monthlyCost / activeVehicles.length).toLocaleString() : 0} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">3rd Party / Own Drivers</p>
                      <p className="text-3xl font-bold">{thirdPartyDrivers.length}/{rentalVehicles.length - thirdPartyDrivers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>

        {/* Add / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={v => { if (!v) closeDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? "Edit Rental Vehicle" : "Add Rental Vehicle"}</DialogTitle>
              <DialogDescription>{editingVehicle ? "Update rental vehicle details." : "Register a new rental or outsourced vehicle."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Plate Number *</Label><Input value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))} placeholder="RT-XXX" /></div>
                <div><Label>Provider *</Label><Input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Company name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Make</Label><Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="HiAce" /></div>
              </div>
              <div><Label>Contract Number</Label><Input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))} placeholder="CNT-001" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contract Start *</Label><Input type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} /></div>
                <div><Label>Contract End *</Label><Input type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Monthly Cost (ETB)</Label><Input type="number" value={form.monthly_cost} onChange={e => setForm(f => ({ ...f, monthly_cost: e.target.value }))} placeholder="0" /></div>
                <div><Label>Daily Rate (ETB)</Label><Input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Driver Type</Label>
                  <Select value={form.driver_type} onValueChange={v => setForm(f => ({ ...f, driver_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">Own Driver</SelectItem>
                      <SelectItem value="third_party">3rd Party Driver</SelectItem>
                      <SelectItem value="none">No Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Driver Phone</Label><Input value={form.driver_phone} onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))} placeholder="+251..." /></div>
              </div>
              <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Driver name" /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.plate_number || !form.provider_name || !form.contract_start || !form.contract_end || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingVehicle ? "Update" : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!showDeleteConfirm} onOpenChange={v => { if (!v) setShowDeleteConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Rental Vehicle</DialogTitle>
              <DialogDescription>This will permanently remove this rental vehicle record. Continue?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RentalVehicles;
