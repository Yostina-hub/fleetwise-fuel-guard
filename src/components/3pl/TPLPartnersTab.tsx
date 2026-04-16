import { useState } from "react";
import { useTPLPartners } from "@/hooks/use3PL";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, Search, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SERVICE_TYPES = ["FTL", "LTL", "Express", "Last Mile", "Cold Chain", "Hazmat", "Oversized", "Intermodal"];

const emptyForm = {
  name: "", code: "", contact_name: "", contact_email: "", contact_phone: "",
  address: "", service_types: [] as string[], coverage_areas: [] as string[],
  status: "active", contract_start: "", contract_end: "", contract_value: "",
  payment_terms: "net_30", notes: "",
};

export function TPLPartnersTab() {
  const { partners, isLoading, createPartner, updatePartner, deletePartner } = useTPLPartners();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowDialog(true); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name, code: p.code || "", contact_name: p.contact_name || "",
      contact_email: p.contact_email || "", contact_phone: p.contact_phone || "",
      address: p.address || "", service_types: p.service_types || [],
      coverage_areas: p.coverage_areas || [], status: p.status,
      contract_start: p.contract_start || "", contract_end: p.contract_end || "",
      contract_value: p.contract_value?.toString() || "", payment_terms: p.payment_terms || "net_30",
      notes: p.notes || "",
    });
    setEditId(p.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      coverage_areas: form.coverage_areas.length > 0 ? form.coverage_areas : [],
    };
    if (editId) {
      updatePartner.mutate({ id: editId, ...payload }, { onSuccess: () => setShowDialog(false) });
    } else {
      createPartner.mutate(payload, { onSuccess: () => setShowDialog(false) });
    }
  };

  const toggleServiceType = (type: string) => {
    setForm(prev => ({
      ...prev,
      service_types: prev.service_types.includes(type)
        ? prev.service_types.filter(t => t !== type)
        : [...prev.service_types, type],
    }));
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." className="pl-10" />
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Partner</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No 3PL partners found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.code && <div className="text-xs text-muted-foreground">{p.code}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.contact_name || "-"}</div>
                    <div className="text-xs text-muted-foreground">{p.contact_email || ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.service_types || []).slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {(p.service_types || []).length > 3 && <Badge variant="outline" className="text-xs">+{(p.service_types as string[]).length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      {p.rating || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.contract_start ? `${p.contract_start} → ${p.contract_end || "ongoing"}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePartner.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Partner" : "Add 3PL Partner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. DHL" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} /></div>
            </div>
            <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} type="email" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div>
              <Label>Service Types</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SERVICE_TYPES.map(t => (
                  <Badge key={t} variant={form.service_types.includes(t) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => toggleServiceType(t)}>{t}</Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payment Terms</Label>
                <Select value={form.payment_terms} onValueChange={v => setForm({...form, payment_terms: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Contract Start</Label><Input type="date" value={form.contract_start} onChange={e => setForm({...form, contract_start: e.target.value})} /></div>
              <div><Label>Contract End</Label><Input type="date" value={form.contract_end} onChange={e => setForm({...form, contract_end: e.target.value})} /></div>
              <div><Label>Contract Value</Label><Input type="number" value={form.contract_value} onChange={e => setForm({...form, contract_value: e.target.value})} placeholder="ETB" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createPartner.isPending || updatePartner.isPending}>
              {editId ? "Save Changes" : "Create Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
