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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, AlertTriangle, Package } from "lucide-react";

export default function AssetInventoryTab() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ asset_id: "", stock_location: "", current_quantity: "", minimum_quantity: "", reorder_point: "5", unit: "pcs", supplier: "", unit_cost: "" });

  const { data: assets = [] } = useQuery({
    queryKey: ["fleet-assets", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("fleet_assets").select("id, asset_code, name").eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["asset-inventory", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_inventory").select("*, fleet_assets(asset_code, name, category)").eq("organization_id", organizationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("asset_inventory").insert({
        organization_id: organizationId,
        asset_id: form.asset_id,
        stock_location: form.stock_location || null,
        current_quantity: parseInt(form.current_quantity) || 0,
        minimum_quantity: parseInt(form.minimum_quantity) || 0,
        reorder_point: parseInt(form.reorder_point) || 5,
        unit: form.unit,
        supplier: form.supplier || null,
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inventory entry added");
      queryClient.invalidateQueries({ queryKey: ["asset-inventory"] });
      setShowAdd(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lowStock = inventory.filter((i: any) => i.current_quantity <= i.reorder_point);
  const totalItems = inventory.reduce((s: number, i: any) => s + (i.current_quantity || 0), 0);
  const totalValue = inventory.reduce((s: number, i: any) => s + ((i.current_quantity || 0) * (i.unit_cost || 0)), 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Inventory Items</p><p className="text-xl font-bold">{inventory.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Quantity</p><p className="text-xl font-bold">{totalItems.toLocaleString()}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{totalValue.toLocaleString()} ETB</p></Card>
        <Card className="p-3 border-warning/30"><p className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low Stock Alerts</p><p className="text-xl font-bold text-warning">{lowStock.length}</p></Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-9"><Plus className="w-4 h-4" />Add Inventory</Button>
      </div>

      <Card>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Min / Reorder</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : inventory.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No inventory entries</TableCell></TableRow>
              ) : (
                inventory.map((i: any) => {
                  const pct = i.minimum_quantity > 0 ? Math.min((i.current_quantity / Math.max(i.minimum_quantity * 3, 1)) * 100, 100) : 100;
                  const isLow = i.current_quantity <= i.reorder_point;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{i.fleet_assets?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{i.fleet_assets?.asset_code}</p>
                      </TableCell>
                      <TableCell className="text-sm">{i.stock_location || "—"}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{i.current_quantity}</span>
                        <span className="text-xs text-muted-foreground ml-1">{i.unit}</span>
                      </TableCell>
                      <TableCell className="text-xs">{i.minimum_quantity} / {i.reorder_point}</TableCell>
                      <TableCell className="w-32">
                        <Progress value={pct} className={`h-2 ${isLow ? "[&>div]:bg-destructive" : "[&>div]:bg-success"}`} />
                        {isLow && <Badge variant="destructive" className="text-[10px] mt-1">Low Stock</Badge>}
                      </TableCell>
                      <TableCell>{i.unit_cost ? `${i.unit_cost.toLocaleString()} ETB` : "—"}</TableCell>
                      <TableCell>{i.unit_cost ? `${(i.current_quantity * i.unit_cost).toLocaleString()} ETB` : "—"}</TableCell>
                      <TableCell className="text-sm">{i.supplier || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Asset *</Label>
              <Select value={form.asset_id} onValueChange={v => setForm(p => ({ ...p, asset_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Stock Location</Label><Input value={form.stock_location} onChange={e => setForm(p => ({ ...p, stock_location: e.target.value }))} placeholder="Warehouse A" /></div>
            <div><Label>Current Quantity</Label><Input type="number" value={form.current_quantity} onChange={e => setForm(p => ({ ...p, current_quantity: e.target.value }))} /></div>
            <div><Label>Minimum Quantity</Label><Input type="number" value={form.minimum_quantity} onChange={e => setForm(p => ({ ...p, minimum_quantity: e.target.value }))} /></div>
            <div><Label>Reorder Point</Label><Input type="number" value={form.reorder_point} onChange={e => setForm(p => ({ ...p, reorder_point: e.target.value }))} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></div>
            <div><Label>Unit Cost (ETB)</Label><Input type="number" value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.asset_id || addMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
