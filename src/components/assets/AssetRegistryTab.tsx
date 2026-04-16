import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Search, Package, Truck, Wrench, CircleDot, Battery, Box, Download, Radio, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";

const CATEGORIES = [
  { value: "vehicle", label: "Vehicle", icon: Truck },
  { value: "gps_tracker", label: "GPS Tracker", icon: Radio },
  { value: "iot_sensor", label: "IoT Sensor", icon: Cpu },
  { value: "equipment", label: "Equipment", icon: Wrench },
  { value: "tool", label: "Tool", icon: Package },
  { value: "tire", label: "Tire", icon: CircleDot },
  { value: "battery", label: "Battery", icon: Battery },
  { value: "other", label: "Other", icon: Box },
];

const STAGES = ["acquired", "deployed", "in_service", "maintenance", "idle", "retired", "disposed"];
const CONDITIONS = ["new", "good", "fair", "poor", "condemned"];

const stageBadge = (stage: string) => {
  const colors: Record<string, string> = {
    acquired: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    deployed: "bg-success/10 text-success border-success/20",
    in_service: "bg-success/10 text-success border-success/20",
    maintenance: "bg-warning/10 text-warning border-warning/20",
    idle: "bg-muted text-muted-foreground",
    retired: "bg-destructive/10 text-destructive border-destructive/20",
    disposed: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return colors[stage] || "";
};

export default function AssetRegistryTab() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState<"vehicles" | "devices">("vehicles");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [form, setForm] = useState({
    asset_code: "", name: "", category: "equipment", sub_category: "",
    serial_number: "", manufacturer: "", model: "", purchase_date: "",
    purchase_cost: "", current_value: "", depreciation_method: "straight_line",
    depreciation_rate: "", salvage_value: "", useful_life_years: "",
    lifecycle_stage: "acquired", condition: "new", location: "",
    warranty_expiry: "", notes: "", vehicle_id: "",
  });

  const { vehicles } = useVehicles();

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("devices")
        .select("*, vehicles:vehicle_id(plate_number)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fleet-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_assets")
        .select("*, vehicles:vehicle_id(id, plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Vehicles not yet linked as assets
  const linkedVehicleIds = new Set(assets.filter((a: any) => a.vehicle_id).map((a: any) => a.vehicle_id));
  const unlinkededVehicles = vehicles.filter(v => !linkedVehicleIds.has(v.id));

  // Devices not yet linked as assets
  const linkedDeviceSerials = new Set(assets.filter((a: any) => a.category === "gps_tracker" || a.category === "iot_sensor").map((a: any) => a.serial_number));
  const unlinkedDevices = devices.filter((d: any) => !linkedDeviceSerials.has(d.imei));

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("fleet_assets").insert({
        organization_id: organizationId,
        asset_code: form.asset_code,
        name: form.name,
        category: form.category,
        sub_category: form.sub_category || null,
        serial_number: form.serial_number || null,
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        current_value: form.current_value ? parseFloat(form.current_value) : null,
        depreciation_method: form.depreciation_method,
        depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : null,
        salvage_value: form.salvage_value ? parseFloat(form.salvage_value) : 0,
        useful_life_years: form.useful_life_years ? parseFloat(form.useful_life_years) : null,
        lifecycle_stage: form.lifecycle_stage,
        condition: form.condition,
        location: form.location || null,
        warranty_expiry: form.warranty_expiry || null,
        notes: form.notes || null,
        vehicle_id: form.vehicle_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset registered");
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
      setShowAdd(false);
      setForm({ asset_code: "", name: "", category: "equipment", sub_category: "", serial_number: "", manufacturer: "", model: "", purchase_date: "", purchase_cost: "", current_value: "", depreciation_method: "straight_line", depreciation_rate: "", salvage_value: "", useful_life_years: "", lifecycle_stage: "acquired", condition: "new", location: "", warranty_expiry: "", notes: "", vehicle_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = vehicles.filter(v => selectedVehicles.includes(v.id));
      const rows = toImport.map((v, idx) => ({
        organization_id: organizationId,
        asset_code: `VH-${v.plate_number?.replace(/\s/g, "") || idx}`,
        name: `${v.make} ${v.model} (${v.plate_number})`,
        category: "vehicle",
        sub_category: v.vehicle_type || null,
        serial_number: v.vin || null,
        manufacturer: v.make,
        model: v.model,
        purchase_date: v.acquisition_date || null,
        purchase_cost: v.acquisition_cost || null,
        current_value: v.acquisition_cost || null,
        depreciation_method: "straight_line",
        depreciation_rate: v.depreciation_rate || null,
        useful_life_years: 10,
        lifecycle_stage: v.status === "active" ? "in_service" : v.status === "maintenance" ? "maintenance" : "idle",
        condition: v.status === "active" ? "good" : v.status === "maintenance" ? "fair" : "fair",
        location: v.depot?.name || null,
        vehicle_id: v.id,
      }));
      const { error } = await (supabase as any).from("fleet_assets").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedVehicles.length} vehicles imported as assets`);
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
      setShowImport(false);
      setSelectedVehicles([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importDevicesMutation = useMutation({
    mutationFn: async () => {
      const toImport = devices.filter((d: any) => selectedDevices.includes(d.id));
      const rows = toImport.map((d: any) => ({
        organization_id: organizationId,
        asset_code: `DEV-${d.imei?.slice(-6) || d.id.slice(0, 6)}`,
        name: `${d.tracker_model} (${d.imei})`,
        category: "gps_tracker",
        sub_category: d.tracker_model || null,
        serial_number: d.imei,
        manufacturer: d.tracker_model?.split(" ")[0] || null,
        model: d.tracker_model || null,
        purchase_date: d.install_date || null,
        lifecycle_stage: d.status === "active" ? "in_service" : d.status === "inactive" ? "idle" : "acquired",
        condition: d.status === "active" ? "good" : "fair",
        location: d.vehicles?.plate_number ? `Vehicle: ${d.vehicles.plate_number}` : null,
        vehicle_id: d.vehicle_id || null,
      }));
      const { error } = await (supabase as any).from("fleet_assets").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedDevices.length} devices imported as assets`);
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
      setShowImport(false);
      setSelectedDevices([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVehicle = (id: string) => {
    setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (importType === "devices") {
      setSelectedDevices(prev => prev.length === unlinkedDevices.length ? [] : unlinkedDevices.map((d: any) => d.id));
    } else {
      setSelectedVehicles(prev => prev.length === unlinkededVehicles.length ? [] : unlinkededVehicles.map(v => v.id));
    }
  };

  const filtered = assets.filter((a: any) => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.asset_code?.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || a.category === filterCategory;
    const matchStage = filterStage === "all" || a.lifecycle_stage === filterStage;
    return matchSearch && matchCat && matchStage;
  });

  const totalValue = assets.reduce((s: number, a: any) => s + (a.current_value || 0), 0);
  const byStage = STAGES.reduce((acc: any, st) => { acc[st] = assets.filter((a: any) => a.lifecycle_stage === st).length; return acc; }, {} as Record<string, number>);
  const vehicleAssets = assets.filter((a: any) => a.category === "vehicle").length;

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-xl font-bold">{assets.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Vehicle Assets</p><p className="text-xl font-bold text-primary">{vehicleAssets}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{totalValue.toLocaleString()} ETB</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">In Service</p><p className="text-xl font-bold text-success">{(byStage.deployed || 0) + (byStage.in_service || 0)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Maintenance</p><p className="text-xl font-bold text-warning">{byStage.maintenance || 0}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Retired/Disposed</p><p className="text-xl font-bold text-destructive">{(byStage.retired || 0) + (byStage.disposed || 0)}</p></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 h-9">
          <Download className="w-4 h-4" />Import Vehicles ({unlinkededVehicles.length})
        </Button>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-9"><Plus className="w-4 h-4" />Add Asset</Button>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-20 w-full" /></Card>)
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No assets found</Card>
        ) : (
          filtered.map((a: any) => (
            <Card key={a.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{a.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{a.asset_code}</p>
                </div>
                <Badge variant="outline" className={cn("capitalize text-xs", stageBadge(a.lifecycle_stage))}>{a.lifecycle_stage?.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize text-xs">{a.category}</Badge>
                {a.vehicles && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Truck className="w-3 h-3" />{a.vehicles.plate_number}
                  </Badge>
                )}
                <span className="capitalize text-xs text-muted-foreground">{a.condition}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-muted-foreground">Cost:</span> {a.purchase_cost ? `${a.purchase_cost.toLocaleString()} ETB` : "—"}</div>
                <div><span className="text-muted-foreground">Value:</span> {a.current_value ? `${a.current_value.toLocaleString()} ETB` : "—"}</div>
                <div><span className="text-muted-foreground">Location:</span> {a.location || "—"}</div>
                <div><span className="text-muted-foreground">Warranty:</span> <LicenseExpiryBadge expiryDate={a.warranty_expiry} /></div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Code</TableHead>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap">Category</TableHead>
                <TableHead className="whitespace-nowrap">Linked Vehicle</TableHead>
                <TableHead className="whitespace-nowrap">Stage</TableHead>
                <TableHead className="whitespace-nowrap">Condition</TableHead>
                <TableHead className="whitespace-nowrap">Purchase Cost</TableHead>
                <TableHead className="whitespace-nowrap">Current Value</TableHead>
                <TableHead className="whitespace-nowrap">Warranty</TableHead>
                <TableHead className="whitespace-nowrap">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>)}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No assets found</TableCell></TableRow>
              ) : (
                filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{a.asset_code}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{a.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{a.category}</Badge></TableCell>
                    <TableCell>
                      {a.vehicles ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Truck className="w-3 h-3" />{a.vehicles.plate_number}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn("capitalize text-xs", stageBadge(a.lifecycle_stage))}>{a.lifecycle_stage?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="capitalize text-sm whitespace-nowrap">{a.condition}</TableCell>
                    <TableCell className="whitespace-nowrap">{a.purchase_cost ? `${a.purchase_cost.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{a.current_value ? `${a.current_value.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell><LicenseExpiryBadge expiryDate={a.warranty_expiry} /></TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{a.location || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Import Vehicles Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />Import Vehicles as Assets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select vehicles to automatically register as fleet assets. Already-linked vehicles are excluded.
          </p>
          {unlinkededVehicles.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">All vehicles are already linked as assets.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedVehicles.length === unlinkededVehicles.length && unlinkededVehicles.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Make / Model</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acq. Cost</TableHead>
                    <TableHead>Depot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkededVehicles.map(v => (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => toggleVehicle(v.id)}>
                      <TableCell>
                        <Checkbox checked={selectedVehicles.includes(v.id)} onCheckedChange={() => toggleVehicle(v.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{v.plate_number}</TableCell>
                      <TableCell>{v.make} {v.model}</TableCell>
                      <TableCell>{v.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("capitalize text-xs",
                          v.status === "active" ? "bg-success/10 text-success" :
                          v.status === "maintenance" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                        )}>{v.status}</Badge>
                      </TableCell>
                      <TableCell>{v.acquisition_cost ? `${v.acquisition_cost.toLocaleString()} ETB` : "—"}</TableCell>
                      <TableCell className="text-sm">{v.depot?.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={selectedVehicles.length === 0 || importMutation.isPending}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              {importMutation.isPending ? "Importing..." : `Import ${selectedVehicles.length} Vehicle${selectedVehicles.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Asset Code *</Label><Input value={form.asset_code} onChange={e => setForm(p => ({ ...p, asset_code: e.target.value }))} placeholder="AST-001" /></div>
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Hydraulic Jack" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Link Vehicle (optional)</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {unlinkededVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Sub-Category</Label><Input value={form.sub_category} onChange={e => setForm(p => ({ ...p, sub_category: e.target.value }))} /></div>
            <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} /></div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => setForm(p => ({ ...p, manufacturer: e.target.value }))} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} /></div>
            <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} /></div>
            <div><Label>Purchase Cost (ETB)</Label><Input type="number" value={form.purchase_cost} onChange={e => setForm(p => ({ ...p, purchase_cost: e.target.value }))} /></div>
            <div><Label>Current Value (ETB)</Label><Input type="number" value={form.current_value} onChange={e => setForm(p => ({ ...p, current_value: e.target.value }))} /></div>
            <div><Label>Depreciation Method</Label>
              <Select value={form.depreciation_method} onValueChange={v => setForm(p => ({ ...p, depreciation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="declining_balance">Declining Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Depreciation Rate (%)</Label><Input type="number" value={form.depreciation_rate} onChange={e => setForm(p => ({ ...p, depreciation_rate: e.target.value }))} /></div>
            <div><Label>Salvage Value (ETB)</Label><Input type="number" value={form.salvage_value} onChange={e => setForm(p => ({ ...p, salvage_value: e.target.value }))} /></div>
            <div><Label>Useful Life (Years)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm(p => ({ ...p, useful_life_years: e.target.value }))} /></div>
            <div><Label>Lifecycle Stage</Label>
              <Select value={form.lifecycle_stage} onValueChange={v => setForm(p => ({ ...p, lifecycle_stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Condition</Label>
              <Select value={form.condition} onValueChange={v => setForm(p => ({ ...p, condition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Warranty Expiry</Label><Input type="date" value={form.warranty_expiry} onChange={e => setForm(p => ({ ...p, warranty_expiry: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.asset_code || !form.name || addMutation.isPending}>
              {addMutation.isPending ? "Registering..." : "Register Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
