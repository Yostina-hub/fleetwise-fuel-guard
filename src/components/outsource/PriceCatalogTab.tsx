import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Tag } from "lucide-react";
import { useOutsourcePriceCatalogs, type PriceCatalog } from "@/hooks/useOutsourcePriceCatalogs";

const empty: Partial<PriceCatalog> = {
  catalog_name: "",
  zone_region: "",
  resource_type: "vehicle",
  vehicle_class: "",
  driver_grade: "",
  unit: "day",
  base_rate: 0,
  fuel_included: false,
  driver_included: false,
  currency: "ETB",
  effective_from: new Date().toISOString().split("T")[0],
  is_active: true,
};

export function PriceCatalogTab() {
  const { catalogs, isLoading, upsert, remove } = useOutsourcePriceCatalogs();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PriceCatalog>>(empty);

  const save = () => {
    if (!editing.catalog_name || !editing.resource_type || editing.base_rate == null) return;
    upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); setEditing(empty); } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Price Catalog (per Org / Zone)</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(empty); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New rate</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} catalog rate</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Catalog name</Label><Input value={editing.catalog_name || ""} onChange={(e) => setEditing({ ...editing, catalog_name: e.target.value })} /></div>
              <div><Label>Zone / Region</Label><Input placeholder="Addis / Adama / Hawassa…" value={editing.zone_region || ""} onChange={(e) => setEditing({ ...editing, zone_region: e.target.value })} /></div>
              <div>
                <Label>Resource type</Label>
                <Select value={editing.resource_type} onValueChange={(v) => setEditing({ ...editing, resource_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="combined">Vehicle + Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={editing.unit} onValueChange={(v) => setEditing({ ...editing, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["hour","day","week","month","km","trip"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle class</Label><Input placeholder="pickup / truck / bus" value={editing.vehicle_class || ""} onChange={(e) => setEditing({ ...editing, vehicle_class: e.target.value })} /></div>
              <div><Label>Driver grade</Label><Input placeholder="junior / senior / heavy" value={editing.driver_grade || ""} onChange={(e) => setEditing({ ...editing, driver_grade: e.target.value })} /></div>
              <div><Label>Base rate (ETB)</Label><Input type="number" value={editing.base_rate ?? 0} onChange={(e) => setEditing({ ...editing, base_rate: Number(e.target.value) })} /></div>
              <div><Label>Overtime rate</Label><Input type="number" value={editing.overtime_rate ?? ""} onChange={(e) => setEditing({ ...editing, overtime_rate: Number(e.target.value) })} /></div>
              <div><Label>Effective from</Label><Input type="date" value={editing.effective_from || ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })} /></div>
              <div><Label>Effective to</Label><Input type="date" value={editing.effective_to || ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.fuel_included || false} onCheckedChange={(v) => setEditing({ ...editing, fuel_included: v })} /><Label>Fuel included</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.driver_included || false} onCheckedChange={(v) => setEditing({ ...editing, driver_included: v })} /><Label>Driver included</Label></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={upsert.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p> :
         catalogs.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No catalog rates defined yet.</p> :
        (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Zone</TableHead><TableHead>Type</TableHead>
              <TableHead>Class / Grade</TableHead><TableHead>Rate</TableHead><TableHead>Effective</TableHead><TableHead>Inclusions</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {catalogs.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.catalog_name}</TableCell>
                  <TableCell>{c.zone_region || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="outline">{c.resource_type}</Badge></TableCell>
                  <TableCell className="text-xs">{c.vehicle_class || c.driver_grade || "—"}</TableCell>
                  <TableCell>{c.currency} {c.base_rate.toLocaleString()} / {c.unit}</TableCell>
                  <TableCell className="text-xs">{c.effective_from} → {c.effective_to || "open"}</TableCell>
                  <TableCell className="text-xs">
                    {c.fuel_included && <Badge variant="secondary" className="mr-1">+Fuel</Badge>}
                    {c.driver_included && <Badge variant="secondary">+Driver</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
