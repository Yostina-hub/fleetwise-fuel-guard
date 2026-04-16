import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { WorkOrderMessageThread } from "@/components/maintenance-enterprise/WorkOrderMessageThread";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export default function SupplierPaymentReview() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [active, setActive] = useState<any>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [working, setWorking] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["supplier-payment-requests", tab],
    queryFn: async () => {
      let q = (supabase as any)
        .from("supplier_payment_requests")
        .select("*, work_orders(work_order_number, supplier_name, vehicle_id, vehicles:vehicle_id(plate_number, make, model))")
        .order("created_at", { ascending: false });
      if (tab === "pending") q = q.eq("status", "submitted");
      else if (tab === "approved") q = q.in("status", ["approved", "paid"]);
      else if (tab === "rejected") q = q.eq("status", "rejected");
      const { data } = await q;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleDecision = async () => {
    if (!active || !decision) return;
    if (decision === "reject" && !reason.trim()) { toast.error("Reason required"); return; }
    setWorking(true);
    try {
      const update: any = {
        status: decision === "approve" ? "approved" : "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (decision === "reject") update.rejection_reason = reason;
      if (decision === "approve" && paymentRef) update.payment_reference = paymentRef;

      const { error } = await (supabase as any)
        .from("supplier_payment_requests")
        .update(update)
        .eq("id", active.id);
      if (error) throw error;

      // Notify supplier in the WO message thread
      await (supabase as any).from("wo_supplier_messages").insert({
        organization_id: active.organization_id,
        work_order_id: active.work_order_id,
        sender_type: "fleet_team",
        sender_id: user?.id,
        sender_name: user?.email || "Fleet Team",
        message: decision === "approve"
          ? `Payment request of ${active.currency} ${active.amount} APPROVED${paymentRef ? ` (Ref: ${paymentRef})` : ""}.`
          : `Payment request of ${active.currency} ${active.amount} REJECTED. Reason: ${reason}`,
      });

      toast.success(`Payment ${decision === "approve" ? "approved" : "rejected"}`);
      setActive(null); setDecision(null); setReason(""); setPaymentRef("");
      qc.invalidateQueries({ queryKey: ["supplier-payment-requests"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6" /> Supplier Payment Requests</h1>
        <p className="text-muted-foreground text-sm">Review and approve payments based on supplier-uploaded documents</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending"><Clock className="w-4 h-4 mr-1" /> Pending</TabsTrigger>
          <TabsTrigger value="approved"><CheckCircle2 className="w-4 h-4 mr-1" /> Approved</TabsTrigger>
          <TabsTrigger value="rejected"><XCircle className="w-4 h-4 mr-1" /> Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No payment requests in this category</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {requests.map((r: any) => (
                <Card key={r.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setActive(r)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-semibold">{r.work_orders?.work_order_number}</span>
                          <Badge variant="outline">{r.work_orders?.vehicles?.plate_number || "—"}</Badge>
                          <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.supplier_name || r.work_orders?.supplier_name || "Supplier"}</p>
                        {r.invoice_number && <p className="text-xs text-muted-foreground">Invoice: {r.invoice_number}</p>}
                        {r.notes && <p className="text-xs mt-1 line-clamp-1">{r.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{r.currency} {Number(r.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PP")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail / Decision dialog */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setDecision(null); setReason(""); setPaymentRef(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Payment Request — {active.work_orders?.work_order_number}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Supplier:</span> <strong>{active.supplier_name || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[active.status]}>{active.status}</Badge></div>
                  <div><span className="text-muted-foreground">Invoice #:</span> {active.invoice_number || "—"}</div>
                  <div><span className="text-muted-foreground">Amount:</span> <strong>{active.currency} {Number(active.amount).toLocaleString()}</strong></div>
                  <div><span className="text-muted-foreground">Submitted:</span> {format(new Date(active.created_at), "PP p")}</div>
                  {active.reviewed_at && <div><span className="text-muted-foreground">Reviewed:</span> {format(new Date(active.reviewed_at), "PP p")}</div>}
                </div>

                {active.notes && (
                  <div>
                    <p className="text-xs font-medium mb-1">Supplier notes</p>
                    <p className="text-sm bg-muted/30 rounded p-2">{active.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium mb-1">Supporting documents</p>
                  <div className="space-y-1">
                    {(active.supporting_documents || []).length === 0 && active.invoice_url && (
                      <a href={active.invoice_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm underline">
                        <FileText className="w-4 h-4" /> Invoice
                      </a>
                    )}
                    {(active.supporting_documents || []).map((d: any, i: number) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm underline">
                        <FileText className="w-4 h-4" /> {d.name}
                      </a>
                    ))}
                  </div>
                </div>

                {active.rejection_reason && (
                  <div className="border-l-4 border-destructive bg-destructive/5 p-2 text-sm">
                    <p className="font-medium text-destructive">Rejection reason</p>
                    <p>{active.rejection_reason}</p>
                  </div>
                )}
                {active.payment_reference && (
                  <div className="border-l-4 border-green-500 bg-green-500/5 p-2 text-sm">
                    <p className="font-medium text-green-700 dark:text-green-400">Payment reference</p>
                    <p>{active.payment_reference}</p>
                  </div>
                )}

                {active.status === "submitted" && (
                  <div className="border-t pt-3 space-y-2">
                    {!decision && (
                      <div className="flex gap-2">
                        <Button onClick={() => setDecision("approve")} className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button onClick={() => setDecision("reject")} variant="destructive" className="flex-1">
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {decision === "approve" && (
                      <>
                        <Input placeholder="Payment reference (optional)" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                        <div className="flex gap-2">
                          <Button onClick={handleDecision} disabled={working} className="flex-1 bg-green-600 hover:bg-green-700">
                            {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Approval
                          </Button>
                          <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
                        </div>
                      </>
                    )}
                    {decision === "reject" && (
                      <>
                        <Textarea placeholder="Rejection reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                        <div className="flex gap-2">
                          <Button onClick={handleDecision} disabled={working} variant="destructive" className="flex-1">
                            {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Rejection
                          </Button>
                          <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="border-t pt-3">
                  <WorkOrderMessageThread
                    workOrderId={active.work_order_id}
                    organizationId={active.organization_id}
                    senderType="fleet_team"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
