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

const rentalVehicles = [
  { id: "1", plate: "RT-001", make: "Toyota", model: "HiAce", provider: "ABC Rentals", contract_start: "2026-01-01", contract_end: "2026-12-31", monthly_cost: 1200, status: "active", driver_name: "External - Hailu M.", driver_type: "third_party" },
  { id: "2", plate: "RT-002", make: "Isuzu", model: "NPR", provider: "XYZ Fleet Co.", contract_start: "2026-03-01", contract_end: "2026-08-31", monthly_cost: 1800, status: "active", driver_name: "Kebede A.", driver_type: "own" },
  { id: "3", plate: "RT-003", make: "Hyundai", model: "HD78", provider: "ABC Rentals", contract_start: "2025-06-01", contract_end: "2026-05-31", monthly_cost: 2200, status: "expiring_soon", driver_name: "External - Tesfaye G.", driver_type: "third_party" },
  { id: "4", plate: "RT-004", make: "Mitsubishi", model: "Canter", provider: "Local Partners", contract_start: "2025-01-01", contract_end: "2025-12-31", monthly_cost: 1500, status: "expired", driver_name: "N/A", driver_type: "none" },
];

const RentalVehicles = () => {
  const [activeTab, setActiveTab] = useState("vehicles");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case "expiring_soon": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expiring Soon</Badge>;
      case "expired": return <Badge variant="destructive">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: rentalVehicles.length,
    active: rentalVehicles.filter(v => v.status === "active").length,
    expiring: rentalVehicles.filter(v => v.status === "expiring_soon").length,
    thirdPartyDrivers: rentalVehicles.filter(v => v.driver_type === "third_party").length,
    monthlyCost: rentalVehicles.filter(v => v.status !== "expired").reduce((s, v) => s + v.monthly_cost, 0),
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Rental & Outsource Vehicles</h1>
              <p className="text-muted-foreground text-xs">Manage rental contracts, third-party drivers & costs</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" /> Add Rental Vehicle
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Rentals", value: stats.total, icon: Truck },
            { label: "Active", value: stats.active, icon: UserCheck, color: "text-emerald-600" },
            { label: "Expiring Soon", value: stats.expiring, icon: Clock, color: "text-amber-600" },
            { label: "3rd Party Drivers", value: stats.thirdPartyDrivers, icon: UserCheck },
            { label: "Monthly Cost", value: `$${stats.monthlyCost.toLocaleString()}`, icon: BarChart3, color: "text-primary" },
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
              {rentalVehicles.map(v => (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{v.plate}</span>
                          {getStatusBadge(v.status)}
                          {v.driver_type === "third_party" && <Badge variant="outline">3rd Party Driver</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{v.make} {v.model} • {v.provider}</p>
                        <p className="text-xs text-muted-foreground">Driver: {v.driver_name} • Contract: {v.contract_start} to {v.contract_end}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${v.monthly_cost}/mo</p>
                        <Button size="sm" variant="outline" className="mt-1">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["ABC Rentals", "XYZ Fleet Co.", "Local Partners"].map(provider => {
                  const pvehicles = rentalVehicles.filter(v => v.provider === provider);
                  return (
                    <Card key={provider}>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> {provider}</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{pvehicles.length} vehicle(s)</p>
                        <p className="text-sm">Active: {pvehicles.filter(v => v.status === "active").length}</p>
                        <p className="text-sm font-medium">Monthly: ${pvehicles.filter(v => v.status !== "expired").reduce((s, v) => s + v.monthly_cost, 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="costs" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">Rental Cost Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Monthly Rental Cost</p>
                      <p className="text-3xl font-bold">${stats.monthlyCost.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Annual Projection</p>
                      <p className="text-3xl font-bold">${(stats.monthlyCost * 12).toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Own vs Rental Ratio</p>
                      <p className="text-3xl font-bold">{stats.thirdPartyDrivers}/{stats.total - stats.thirdPartyDrivers}</p>
                      <p className="text-xs text-muted-foreground">3rd party / own drivers</p>
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
                <div><Label>Plate Number</Label><Input placeholder="RT-XXX" /></div>
                <div><Label>Provider</Label><Input placeholder="Company name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Make</Label><Input placeholder="Toyota" /></div>
                <div><Label>Model</Label><Input placeholder="HiAce" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contract Start</Label><Input type="date" /></div>
                <div><Label>Contract End</Label><Input type="date" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Monthly Cost ($)</Label><Input type="number" placeholder="0" /></div>
                <div><Label>Driver Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">Own Driver</SelectItem>
                      <SelectItem value="third_party">3rd Party Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => setShowAddDialog(false)}>Add Vehicle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RentalVehicles;
