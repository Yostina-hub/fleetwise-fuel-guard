import { useState } from "react";
import { useTPLRateCards, useTPLPartners } from "@/hooks/use3PL";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SERVICE_TYPES = ["FTL", "LTL", "Express", "Last Mile", "Cold Chain", "Hazmat", "Oversized", "Intermodal"];

const emptyForm = {
  partner_id: "", name: "", service_type: "", origin_zone: "", destination_zone: "",
  flat_rate: "", rate_per_kg: "", weight_min_kg: "", weight_max_kg: "",
  effective_from: "", effective_until: "", is_active: true, currency: "ETB",
};

export function TPLRateCardsTab() {
  const { rateCards, isLoading, createRateCard, updateRateCard, deleteRateCard } = useTPLRateCards();
  const { partners } = useTPLPartners();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = rateCards.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).tpl_partners?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowDialog(true); };
  const openEdit = (r: any) => {
    setForm({
      partner_id: r.partner_id, name: r.name, service_type: r.service_type || "",
      origin_zone: r.origin_zone || "", destination_zone: r.destination_zone || "",
      flat_rate: r.flat_rate?.toString() || "", rate_per_kg: r.rate_per_kg?.toString() || "",
      weight_min_kg: r.weight_min_kg?.toString() || "", weight_max_kg: r.weight_max_kg?.toString() || "",
      effective_from: r.effective_from || "", effective_until: r.effective_until || "",
      is_active: r.is_active ?? true, currency: r.currency || "ETB",
    });
    setEditId(r.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.partner_id || !form.name.trim()) return;
    const payload = {
      ...form,
      flat_rate: form.flat_rate ? parseFloat(form.flat_rate) : null,
      rate_per_kg: form.rate_per_kg ? parseFloat(form.rate_per_kg) : null,
      weight_min_kg: form.weight_min_kg ? parseFloat(form.weight_min_kg) : null,
      weight_max_kg: form.weight_max_kg ? parseFloat(form.weight_max_kg) : null,
      effective_from: form.effective_from || null,
      effective_until: form.effective_until || null,
      service_type: form.service_type || null,
      origin_zone: form.origin_zone || null,
      destination_zone: form.destination_zone || null,
    };
    if (editId) {
      updateRateCard.mutate({ id: editId, ...payload }, { onSuccess: () => setShowDialog(false) });
    } else {
      createRateCard.mutate(payload, { onSuccess: () => setShowDialog(false) });
    }
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rate cards..." className="pl-10" />
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Rate Card</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No rate cards found. Create pricing rules for your 3PL partners.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Flat Rate</TableHead>
                <TableHead>Per Kg</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{(r as any).tpl_partners?.name || "-"}</TableCell>
                  <TableCell>{r.service_type ? <Badge variant="outline">{r.service_type}</Badge> : "-"}</TableCell>
                  <TableCell className="text-sm">
                    {r.origin_zone || r.destination_zone
                      ? `${r.origin_zone || "Any"} → ${r.destination_zone || "Any"}`
                      : "-"}
                  </TableCell>
                  <TableCell>{r.flat_rate ? `${r.flat_rate} ${r.currency || "ETB"}` : "-"}</TableCell>
                  <TableCell>{r.rate_per_kg ? `${r.rate_per_kg} ${r.currency || "ETB"}/kg` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRateCard.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Rate Card" : "Add Rate Card"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Partner *</Label>
                <Select value={form.partner_id} onValueChange={v => setForm({...form, partner_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Standard FTL" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({...form, service_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({...form, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Origin Zone</Label><Input value={form.origin_zone} onChange={e => setForm({...form, origin_zone: e.target.value})} placeholder="e.g. Addis Ababa" /></div>
              <div><Label>Destination Zone</Label><Input value={form.destination_zone} onChange={e => setForm({...form, destination_zone: e.target.value})} placeholder="e.g. Dire Dawa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Flat Rate</Label><Input type="number" value={form.flat_rate} onChange={e => setForm({...form, flat_rate: e.target.value})} /></div>
              <div><Label>Rate per Kg</Label><Input type="number" value={form.rate_per_kg} onChange={e => setForm({...form, rate_per_kg: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Weight (kg)</Label><Input type="number" value={form.weight_min_kg} onChange={e => setForm({...form, weight_min_kg: e.target.value})} /></div>
              <div><Label>Max Weight (kg)</Label><Input type="number" value={form.weight_max_kg} onChange={e => setForm({...form, weight_max_kg: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={e => setForm({...form, effective_from: e.target.value})} /></div>
              <div><Label>Effective Until</Label><Input type="date" value={form.effective_until} onChange={e => setForm({...form, effective_until: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRateCard.isPending || updateRateCard.isPending}>
              {editId ? "Save" : "Create Rate Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
