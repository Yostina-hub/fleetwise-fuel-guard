import { useState } from "react";
import { useTPLInvoices, useTPLPartners } from "@/hooks/use3PL";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline", approved: "secondary", paid: "default", overdue: "destructive", disputed: "destructive",
};

const emptyForm = {
  partner_id: "", invoice_number: "", issue_date: new Date().toISOString().split("T")[0],
  due_date: "", subtotal: "", tax_amount: "", total_amount: "", status: "pending",
  payment_reference: "", notes: "",
};

export function TPLInvoicesTab() {
  const { invoices, isLoading, createInvoice, updateInvoice, deleteInvoice } = useTPLInvoices();
  const { partners } = useTPLPartners();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (i as any).tpl_partners?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowDialog(true); };
  const openEdit = (inv: any) => {
    setForm({
      partner_id: inv.partner_id, invoice_number: inv.invoice_number,
      issue_date: inv.issue_date || "", due_date: inv.due_date || "",
      subtotal: inv.subtotal?.toString() || "", tax_amount: inv.tax_amount?.toString() || "",
      total_amount: inv.total_amount?.toString() || "", status: inv.status,
      payment_reference: inv.payment_reference || "", notes: inv.notes || "",
    });
    setEditId(inv.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.partner_id || !form.invoice_number.trim()) return;
    const payload = {
      ...form,
      subtotal: form.subtotal ? parseFloat(form.subtotal) : 0,
      tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : 0,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : 0,
      due_date: form.due_date || null,
    };
    if (editId) {
      updateInvoice.mutate({ id: editId, ...payload }, { onSuccess: () => setShowDialog(false) });
    } else {
      createInvoice.mutate(payload, { onSuccess: () => setShowDialog(false) });
    }
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Total Invoices</div><div className="text-2xl font-bold">{invoices.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-warning">{totalPending.toLocaleString()} ETB</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Paid</div><div className="text-2xl font-bold text-success">{totalPaid.toLocaleString()} ETB</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">Overdue</div><div className="text-2xl font-bold text-destructive">{invoices.filter(i => i.status === "overdue").length}</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-10" />
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No invoices found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>{(inv as any).tpl_partners?.name || "-"}</TableCell>
                  <TableCell>{inv.issue_date}</TableCell>
                  <TableCell>{inv.due_date || "-"}</TableCell>
                  <TableCell className="font-medium">{(inv.total_amount || 0).toLocaleString()} ETB</TableCell>
                  <TableCell><Badge variant={STATUS_MAP[inv.status] || "outline"}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteInvoice.mutate(inv.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Edit Invoice" : "Create Invoice"}</DialogTitle></DialogHeader>
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
              <div><Label>Invoice # *</Label><Input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Subtotal</Label><Input type="number" value={form.subtotal} onChange={e => {
                const sub = e.target.value;
                const tax = form.tax_amount || "0";
                setForm({...form, subtotal: sub, total_amount: (parseFloat(sub || "0") + parseFloat(tax)).toString()});
              }} /></div>
              <div><Label>Tax</Label><Input type="number" value={form.tax_amount} onChange={e => {
                const tax = e.target.value;
                const sub = form.subtotal || "0";
                setForm({...form, tax_amount: tax, total_amount: (parseFloat(sub) + parseFloat(tax || "0")).toString()});
              }} /></div>
              <div><Label>Total</Label><Input type="number" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payment Ref</Label><Input value={form.payment_reference} onChange={e => setForm({...form, payment_reference: e.target.value})} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createInvoice.isPending || updateInvoice.isPending}>
              {editId ? "Save" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
