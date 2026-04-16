import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Search, Package, Truck, Wrench, CircleDot, Battery, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import LicenseExpiryBadge from "@/components/fleet/LicenseExpiryBadge";

const CATEGORIES = [
  { value: "vehicle", label: "Vehicle", icon: Truck },
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
  const [form, setForm] = useState({
    asset_code: "", name: "", category: "equipment", sub_category: "",
    serial_number: "", manufacturer: "", model: "", purchase_date: "",
    purchase_cost: "", current_value: "", depreciation_method: "straight_line",
    depreciation_rate: "", salvage_value: "", useful_life_years: "",
    lifecycle_stage: "acquired", condition: "new", location: "",
    warranty_expiry: "", notes: "",
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fleet-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_assets")
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset registered");
      queryClient.invalidateQueries({ queryKey: ["fleet-assets"] });
      setShowAdd(false);
      setForm({ asset_code: "", name: "", category: "equipment", sub_category: "", serial_number: "", manufacturer: "", model: "", purchase_date: "", purchase_cost: "", current_value: "", depreciation_method: "straight_line", depreciation_rate: "", salvage_value: "", useful_life_years: "", lifecycle_stage: "acquired", condition: "new", location: "", warranty_expiry: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = assets.filter((a: any) => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.asset_code?.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || a.category === filterCategory;
    const matchStage = filterStage === "all" || a.lifecycle_stage === filterStage;
    return matchSearch && matchCat && matchStage;
  });

  // Summary counts
  const totalValue = assets.reduce((s: number, a: any) => s + (a.current_value || 0), 0);
  const byStage = STAGES.reduce((acc: any, st) => { acc[st] = assets.filter((a: any) => a.lifecycle_stage === st).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-xl font-bold">{assets.length}</p></Card>
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
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-9"><Plus className="w-4 h-4" />Add Asset</Button>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Purchase Cost</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>)}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No assets found</TableCell></TableRow>
              ) : (
                filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{a.category}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={cn("capitalize text-xs", stageBadge(a.lifecycle_stage))}>{a.lifecycle_stage?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="capitalize text-sm">{a.condition}</TableCell>
                    <TableCell>{a.purchase_cost ? `${a.purchase_cost.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell>{a.current_value ? `${a.current_value.toLocaleString()} ETB` : "—"}</TableCell>
                    <TableCell><LicenseExpiryBadge expiryDate={a.warranty_expiry} /></TableCell>
                    <TableCell className="text-sm">{a.location || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

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
