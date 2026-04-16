import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, DollarSign, CheckCircle, XCircle, Eye, FileText, Search } from "lucide-react";
import { useSupplierPayments } from "@/hooks/useSupplierPayments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";

const paymentStatusColors: Record<string, string> = {
  submitted: "bg-blue-500/20 text-blue-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  paid: "bg-emerald-500/20 text-emerald-400",
};

const SupplierPaymentsTab = () => {
  const { organizationId } = useOrganization();
  const { payments, isLoading, submitPayment, reviewPayment } = useSupplierPayments();
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewReason, setReviewReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workOrders = [] } = useQuery({
    queryKey: ["wo-for-payments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("work_orders").select("id, work_order_number, status")
        .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [form, setForm] = useState({ work_order_id: "", supplier_name: "", invoice_number: "", amount: "", notes: "" });

  const handleSubmit = async () => {
    if (!form.work_order_id || !form.supplier_name || !form.amount) { toast.error("Work order, supplier, and amount required"); return; }
    await submitPayment.mutateAsync({
      work_order_id: form.work_order_id,
      supplier_name: form.supplier_name,
      invoice_number: form.invoice_number || undefined,
      amount: Number(form.amount),
      notes: form.notes || undefined,
    });
    setShowCreate(false);
    setForm({ work_order_id: "", supplier_name: "", invoice_number: "", amount: "", notes: "" });
  };

  const filtered = payments.filter(p =>
    !searchQuery || p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.work_order?.work_order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Submit Invoice</Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payment requests</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.work_order?.work_order_number || "—"}</TableCell>
                  <TableCell>{p.supplier_name || "—"}</TableCell>
                  <TableCell>{p.invoice_number || "—"}</TableCell>
                  <TableCell className="font-medium">{Number(p.amount).toLocaleString()} {p.currency}</TableCell>
                  <TableCell><Badge className={paymentStatusColors[p.status] || ""} variant="outline">{p.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(p.created_at), "MMM dd")}</TableCell>
                  <TableCell>
                    {(p.status === "submitted" || p.status === "under_review") && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="text-green-400" onClick={() => { setShowReview(p.id); setReviewAction("approved"); }}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400" onClick={() => { setShowReview(p.id); setReviewAction("rejected"); }}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Submit Payment Request</DialogTitle>
            <DialogDescription>Submit a supplier invoice for review and payment approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Work Order *</Label>
              <Select value={form.work_order_id} onValueChange={v => setForm(f => ({ ...f, work_order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                <SelectContent>{workOrders.map(w => <SelectItem key={w.id} value={w.id}>{w.work_order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Supplier Name *</Label><Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} /></div>
            <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
            <div><Label>Amount (ETB) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitPayment.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!showReview} onOpenChange={() => setShowReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approved" ? "Approve" : "Reject"} Payment</DialogTitle>
            <DialogDescription>Review and {reviewAction === "approved" ? "approve" : "reject"} this payment request.</DialogDescription>
          </DialogHeader>
          {reviewAction === "approved" ? (
            <div><Label>Payment Reference</Label><Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. Bank ref #" /></div>
          ) : (
            <div><Label>Rejection Reason *</Label><Textarea value={reviewReason} onChange={e => setReviewReason(e.target.value)} rows={3} /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(null)}>Cancel</Button>
            <Button variant={reviewAction === "rejected" ? "destructive" : "default"} onClick={() => {
              if (reviewAction === "rejected" && !reviewReason.trim()) { toast.error("Reason required"); return; }
              reviewPayment.mutate({ id: showReview!, action: reviewAction, reason: reviewReason, paymentRef });
              setShowReview(null); setReviewReason(""); setPaymentRef("");
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPaymentsTab;
