import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, CheckCircle, Star, Search, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

const VENDOR_TYPES = ["fuel", "maintenance", "tires", "insurance", "parts", "services", "other"];

const emptyVendor = {
  name: "", contact_person: "", email: "", phone: "", vendor_type: "maintenance",
  rating: 0, is_active: true, address: "", notes: "",
};

const VendorManagement = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyVendor);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (form.rating < 0 || form.rating > 5) e.rating = "Rating must be 0–5";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        rating: form.rating || null,
        organization_id: organizationId!,
      };
      if (editing) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", editing.id).eq("organization_id", organizationId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Vendor updated" : "Vendor added");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save vendor"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vendor deleted"); qc.invalidateQueries({ queryKey: ["vendors"] }); },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const openAdd = () => { setEditing(null); setForm(emptyVendor); setErrors({}); setDialogOpen(true); };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ name: v.name || "", contact_person: v.contact_person || "", email: v.email || "", phone: v.phone || "", vendor_type: v.vendor_type || "maintenance", rating: v.rating || 0, is_active: v.is_active ?? true, address: v.address || "", notes: v.notes || "" });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => { if (validate()) saveMutation.mutate(); };

  const active = vendors.filter((v: any) => v.is_active);
  const filtered = vendors.filter((v: any) => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.vendor_type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Vendor Management</h1><p className="text-muted-foreground">Manage suppliers, service providers, and vendor contracts</p></div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Vendor</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{vendors.length}</p><p className="text-sm text-muted-foreground">Total Vendors</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{active.length}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Star className="h-8 w-8 text-yellow-500" /><div><p className="text-2xl font-bold">{vendors.filter((v: any) => v.rating && v.rating >= 4).length}</p><p className="text-sm text-muted-foreground">Top Rated (4+)</p></div></div></CardContent></Card>
        </div>

        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Type</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow> :
            filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.contact_person || "—"}</TableCell>
                <TableCell>{v.email || "—"}</TableCell>
                <TableCell>{v.phone || "—"}</TableCell>
                <TableCell className="capitalize">{v.vendor_type}</TableCell>
                <TableCell>{v.rating ? `${v.rating}/5` : "—"}</TableCell>
                <TableCell><Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this vendor?")) deleteMutation.mutate(v.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={errors.name ? "border-destructive" : ""} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={errors.email ? "border-destructive" : ""} />{errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vendor Type</Label>
                  <Select value={form.vendor_type} onValueChange={v => setForm(p => ({ ...p, vendor_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VENDOR_TYPES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Rating (0–5)</Label><Input type="number" min={0} max={5} step={0.5} value={form.rating} onChange={e => setForm(p => ({ ...p, rating: parseFloat(e.target.value) || 0 }))} className={errors.rating ? "border-destructive" : ""} /></div>
              </div>
              <div className="flex items-end gap-2"><Label>Active</Label>
                  <Select value={form.is_active ? "true" : "false"} onValueChange={v => setForm(p => ({ ...p, is_active: v === "true" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default VendorManagement;
