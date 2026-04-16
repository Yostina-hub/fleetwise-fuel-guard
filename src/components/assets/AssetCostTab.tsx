import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, DollarSign, Wrench, Fuel, Shield, TrendingDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COST_TYPES = [
  { value: "acquisition", label: "Acquisition", icon: DollarSign },
  { value: "preventive_maintenance", label: "Preventive Maintenance", icon: Wrench },
  { value: "corrective_maintenance", label: "Corrective Maintenance", icon: Wrench },
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "insurance", label: "Insurance", icon: Shield },
  { value: "depreciation", label: "Depreciation", icon: TrendingDown },
  { value: "disposal", label: "Disposal", icon: DollarSign },
  { value: "other", label: "Other", icon: DollarSign },
];

const emptyForm = { asset_id: "", cost_type: "preventive_maintenance", amount: "", description: "", recorded_by: "", recorded_date: new Date().toISOString().split("T")[0] };

export default function AssetCostTab() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterAsset, setFilterAsset] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: assets = [] } = useQuery({
    queryKey: ["fleet-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("fleet_assets").select("id, asset_code, name").eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["asset-costs", organizationId, filterType, filterAsset],
    queryFn: async () => {
      let query = (supabase as any).from("asset_cost_records").select("*, fleet_assets(asset_code, name)").eq("organization_id", organizationId!).order("recorded_date", { ascending: false }).limit(500);
      if (filterType !== "all") query = query.eq("cost_type", filterType);
      if (filterAsset !== "all") query = query.eq("asset_id", filterAsset);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: fuelCostAgg = { total: 0, count: 0 } } = useQuery({
    queryKey: ["asset-fuel-cost-agg", organizationId],
    queryFn: async () => {
      const { data: linkedAssets } = await (supabase as any).from("fleet_assets").select("vehicle_id").eq("organization_id", organizationId!).not("vehicle_id", "is", null);
      const vids = (linkedAssets || []).map((a: any) => a.vehicle_id).filter(Boolean);
      if (!vids.length) return { total: 0, count: 0 };
      const { data: txns } = await supabase.from("fuel_transactions").select("fuel_cost").eq("organization_id", organizationId!).in("vehicle_id", vids);
      const total = (txns || []).reduce((s, t: any) => s + (t.fuel_cost || 0), 0);
      return { total, count: txns?.length || 0 };
    },
    enabled: !!organizationId,
  });

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      asset_id: c.asset_id,
      cost_type: c.cost_type || "other",
      amount: c.amount?.toString() || "",
      description: c.description || "",
      recorded_by: c.recorded_by || "",
      recorded_date: c.recorded_date || new Date().toISOString().split("T")[0],
    });
    setShowAdd(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        asset_id: form.asset_id,
        cost_type: form.cost_type,
        amount: parseFloat(form.amount) || 0,
        description: form.description || null,
        recorded_by: form.recorded_by || null,
        recorded_date: form.recorded_date,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("asset_cost_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("asset_cost_records").insert({ ...payload, organization_id: organizationId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Cost updated" : "Cost recorded");
      queryClient.invalidateQueries({ queryKey: ["asset-costs"] });
      setShowAdd(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("asset_cost_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cost record deleted");
      queryClient.invalidateQueries({ queryKey: ["asset-costs"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const manualFuelCost = costs.filter((c: any) => c.cost_type === "fuel").reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalFuelCost = manualFuelCost + fuelCostAgg.total;
  const totalCost = costs.reduce((s: number, c: any) => s + (c.amount || 0), 0) + fuelCostAgg.total;
  const preventiveCost = costs.filter((c: any) => c.cost_type === "preventive_maintenance").reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const correctiveCost = costs.filter((c: any) => c.cost_type === "corrective_maintenance").reduce((s: number, c: any) => s + (c.amount || 0), 0);

  const costTypeColor = (type: string) => {
    const m: Record<string, string> = {
      preventive_maintenance: "bg-success/10 text-success border-success/20",
      corrective_maintenance: "bg-warning/10 text-warning border-warning/20",
      acquisition: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      fuel: "bg-warning/10 text-warning border-warning/20",
      insurance: "bg-primary/10 text-primary border-primary/20",
      depreciation: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return m[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Cost (incl. Fuel)</p><p className="text-xl font-bold">{totalCost.toLocaleString()} ETB</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Fuel Cost (Auto)</p><p className="text-xl font-bold text-amber-400">{totalFuelCost.toLocaleString()} ETB</p><p className="text-[10px] text-muted-foreground">{fuelCostAgg.count} transactions</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Preventive Maintenance</p><p className="text-xl font-bold text-success">{preventiveCost.toLocaleString()} ETB</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Corrective Maintenance</p><p className="text-xl font-bold text-warning">{correctiveCost.toLocaleString()} ETB</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Records</p><p className="text-xl font-bold">{costs.length}</p></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterAsset} onValueChange={setFilterAsset}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            {assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cost Types</SelectItem>
            {COST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowAdd(true); }} className="gap-1.5 h-9"><Plus className="w-4 h-4" />Record Cost</Button>
      </div>

      <Card>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Cost Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : costs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cost records</TableCell></TableRow>
              ) : (
                costs.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{format(new Date(c.recorded_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{c.fleet_assets?.name}</p>
                      <p className="text-xs text-muted-foreground">{c.fleet_assets?.asset_code}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs capitalize", costTypeColor(c.cost_type))}>
                        {c.cost_type?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{c.amount?.toLocaleString()} ETB</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{c.description || "—"}</TableCell>
                    <TableCell className="text-sm">{c.recorded_by || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Record</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this cost record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Cost Dialog */}
      <Dialog open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Cost Record" : "Record Cost"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Asset *</Label>
              <Select value={form.asset_id} onValueChange={v => setForm(p => ({ ...p, asset_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Cost Type</Label>
              <Select value={form.cost_type} onValueChange={v => setForm(p => ({ ...p, cost_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount (ETB) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Date</Label><Input type="date" value={form.recorded_date} onChange={e => setForm(p => ({ ...p, recorded_date: e.target.value }))} /></div>
            <div><Label>Recorded By</Label><Input value={form.recorded_by} onChange={e => setForm(p => ({ ...p, recorded_by: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.asset_id || !form.amount || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
