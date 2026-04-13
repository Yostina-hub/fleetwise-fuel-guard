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
import { CircleDot, Plus, Search, BarChart3, History, AlertTriangle, TrendingUp } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";

const TireManagement = () => {
  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { vehicles } = useVehicles();

  // Mock data for tire inventory
  const tireInventory = [
    { id: "1", brand: "Michelin", model: "X Multi D", size: "315/80R22.5", position: "Front Left", vehicle_plate: "ET-1234", km_driven: 45000, max_km: 80000, status: "good", cost: 450, installed_date: "2025-08-15" },
    { id: "2", brand: "Bridgestone", model: "R297", size: "315/80R22.5", position: "Front Right", vehicle_plate: "ET-1234", km_driven: 45000, max_km: 80000, status: "good", cost: 460, installed_date: "2025-08-15" },
    { id: "3", brand: "Goodyear", model: "KMAX S", size: "295/80R22.5", position: "Rear Left Outer", vehicle_plate: "ET-5678", km_driven: 72000, max_km: 80000, status: "warning", cost: 420, installed_date: "2025-01-10" },
    { id: "4", brand: "Continental", model: "HDL2+", size: "295/80R22.5", position: "Rear Right Inner", vehicle_plate: "ET-9012", km_driven: 81000, max_km: 80000, status: "critical", cost: 480, installed_date: "2024-06-20" },
    { id: "5", brand: "Michelin", model: "X Line Energy", size: "315/70R22.5", position: "Front Left", vehicle_plate: "ET-3456", km_driven: 12000, max_km: 120000, status: "good", cost: 520, installed_date: "2026-02-01" },
  ];

  const tireChanges = [
    { id: "1", vehicle_plate: "ET-9012", position: "Rear Right Inner", old_brand: "Bridgestone R297", new_brand: "Continental HDL2+", reason: "Worn out", km_at_change: 78000, changed_date: "2026-03-15", technician: "Abebe K.", cost: 480 },
    { id: "2", vehicle_plate: "ET-1234", position: "All (4)", old_brand: "Various", new_brand: "Michelin X Multi D", reason: "Scheduled replacement", km_at_change: 120000, changed_date: "2025-08-15", technician: "Dawit T.", cost: 1840 },
    { id: "3", vehicle_plate: "ET-5678", position: "Front Right", old_brand: "Goodyear KMAX S", new_brand: "Goodyear KMAX S", reason: "Puncture", km_at_change: 35000, changed_date: "2026-01-22", technician: "Samuel M.", cost: 420 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "good": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Good</Badge>;
      case "warning": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Replace Soon</Badge>;
      case "critical": return <Badge variant="destructive">Overdue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWearPercent = (km: number, max: number) => Math.min(100, Math.round((km / max) * 100));

  const stats = {
    total: tireInventory.length,
    good: tireInventory.filter(t => t.status === "good").length,
    warning: tireInventory.filter(t => t.status === "warning").length,
    critical: tireInventory.filter(t => t.status === "critical").length,
    totalCost: tireInventory.reduce((s, t) => s + t.cost, 0),
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <CircleDot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Tire Management</h1>
              <p className="text-muted-foreground text-xs">Track tire inventory, wear, replacements & costs</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" /> Add Tire
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Tires", value: stats.total, icon: CircleDot, color: "text-primary" },
            { label: "Good", value: stats.good, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Replace Soon", value: stats.warning, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Overdue", value: stats.critical, icon: AlertTriangle, color: "text-destructive" },
            { label: "Total Cost", value: `$${stats.totalCost.toLocaleString()}`, icon: BarChart3, color: "text-primary" },
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
            <TabsTrigger value="inventory" className="gap-1.5">
              <CircleDot className="w-3.5 h-3.5" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> Change History
            </TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Cost Analysis
            </TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="inventory" className="mt-0 space-y-3">
              {tireInventory.map(tire => (
                <Card key={tire.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tire.brand} {tire.model}</span>
                          {getStatusBadge(tire.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tire.vehicle_plate} • {tire.position} • {tire.size}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">{tire.km_driven.toLocaleString()} / {tire.max_km.toLocaleString()} km</p>
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              getWearPercent(tire.km_driven, tire.max_km) > 90 ? "bg-destructive" :
                              getWearPercent(tire.km_driven, tire.max_km) > 75 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${getWearPercent(tire.km_driven, tire.max_km)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{getWearPercent(tire.km_driven, tire.max_km)}% worn</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="changes" className="mt-0 space-y-3">
              {tireChanges.map(change => (
                <Card key={change.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{change.vehicle_plate} — {change.position}</p>
                        <p className="text-sm text-muted-foreground">{change.old_brand} → {change.new_brand}</p>
                        <p className="text-xs text-muted-foreground">Reason: {change.reason} • By: {change.technician}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">${change.cost}</p>
                        <p className="text-xs text-muted-foreground">@ {change.km_at_change.toLocaleString()} km</p>
                        <p className="text-xs text-muted-foreground">{change.changed_date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="costs" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tire Cost Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Spent (Current Inventory)</p>
                      <p className="text-3xl font-bold">${stats.totalCost.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Avg Cost Per Tire</p>
                      <p className="text-3xl font-bold">${Math.round(stats.totalCost / stats.total).toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Replacements This Quarter</p>
                      <p className="text-3xl font-bold">{tireChanges.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>

        {/* Add Tire Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tire to Inventory</DialogTitle>
              <DialogDescription>Register a new tire installation on a vehicle.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Brand</Label><Input placeholder="e.g. Michelin" /></div>
                <div><Label>Model</Label><Input placeholder="e.g. X Multi D" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Size</Label><Input placeholder="e.g. 315/80R22.5" /></div>
                <div><Label>Position</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {["Front Left", "Front Right", "Rear Left Inner", "Rear Left Outer", "Rear Right Inner", "Rear Right Outer"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vehicle</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.slice(0, 20).map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Cost ($)</Label><Input type="number" placeholder="0.00" /></div>
              </div>
              <div><Label>Max KM Life</Label><Input type="number" placeholder="80000" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => setShowAddDialog(false)}>Add Tire</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TireManagement;
