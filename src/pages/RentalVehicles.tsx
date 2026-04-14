import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Truck, Plus, Building2, UserCheck, BarChart3, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const RentalVehicles = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("vehicles");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    plate_number: "", make: "", model: "", provider_name: "", contract_start: "", contract_end: "", monthly_cost: "", driver_name: "", driver_type: "own",
  });

  const { data: rentalVehicles = [], isLoading } = useQuery({
    queryKey: ["rental-vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rental_vehicles")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rental_vehicles").insert({
        organization_id: organizationId!,
        plate_number: form.plate_number,
        make: form.make || null,
        model: form.model || null,
        provider_name: form.provider_name,
        contract_start: form.contract_start,
        contract_end: form.contract_end,
        monthly_cost: form.monthly_cost ? parseFloat(form.monthly_cost) : 0,
        driver_name: form.driver_name || null,
        driver_type: form.driver_type,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rental vehicle added");
      queryClient.invalidateQueries({ queryKey: ["rental-vehicles"] });
      setShowAddDialog(false);
      setForm({ plate_number: "", make: "", model: "", provider_name: "", contract_start: "", contract_end: "", monthly_cost: "", driver_name: "", driver_type: "own" });
    },
    onError: (err: any) => toast.error(err.message),
  });

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
  const monthlyCost = rentalVehicles.filter((v: any) => v.status !== "expired" && v.status !== "terminated").reduce((s: number, v: any) => s + (v.monthly_cost || 0), 0);

  // Group by provider
  const providers: Record<string, any[]> = {};
  rentalVehicles.forEach((v: any) => {
    if (!providers[v.provider_name]) providers[v.provider_name] = [];
    providers[v.provider_name].push(v);
  });

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
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
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
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="vehicles" className="gap-1.5"><Truck className="w-3.5 h-3.5" /> Vehicles</TabsTrigger>
            <TabsTrigger value="providers" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Providers</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Cost Analysis</TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="vehicles" className="mt-0 space-y-3">
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
              ) : rentalVehicles.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No rental vehicles registered.</p>
                  <p className="text-xs mt-1">Click "Add Rental Vehicle" to start tracking.</p>
                </CardContent></Card>
              ) : (
                rentalVehicles.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{v.plate_number}</span>
                            {getStatusBadge(v.status)}
                            {v.driver_type === "third_party" && <Badge variant="outline">3rd Party Driver</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{v.make} {v.model} • {v.provider_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Driver: {v.driver_name || "N/A"} • Contract: {format(new Date(v.contract_start), "MMM dd, yyyy")} to {format(new Date(v.contract_end), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{v.monthly_cost?.toLocaleString()} ETB/mo</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monthly Rental Cost</p>
                      <p className="text-3xl font-bold">{monthlyCost.toLocaleString()} ETB</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Annual Projection</p>
                      <p className="text-3xl font-bold">{(monthlyCost * 12).toLocaleString()} ETB</p>
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

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Rental Vehicle</DialogTitle>
              <DialogDescription>Register a new rental or outsourced vehicle.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Plate Number *</Label><Input value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))} placeholder="RT-XXX" /></div>
                <div><Label>Provider *</Label><Input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Company name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Make</Label><Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="HiAce" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contract Start *</Label><Input type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} /></div>
                <div><Label>Contract End *</Label><Input type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Monthly Cost (ETB)</Label><Input type="number" value={form.monthly_cost} onChange={e => setForm(f => ({ ...f, monthly_cost: e.target.value }))} placeholder="0" /></div>
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
              </div>
              <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Driver name" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.plate_number || !form.provider_name || !form.contract_start || !form.contract_end || addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RentalVehicles;
