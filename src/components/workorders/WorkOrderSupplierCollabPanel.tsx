import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Copy,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { WorkOrderMessageThread } from "@/components/maintenance-enterprise/WorkOrderMessageThread";

interface Props {
  workOrderId: string;
  organizationId: string;
  workOrderNumber: string;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  paid: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export default function WorkOrderSupplierCollabPanel({
  workOrderId,
  organizationId,
  workOrderNumber,
}: Props) {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [working, setWorking] = useState(false);

  const { data: payments = [], refetch } = useQuery({
    queryKey: ["wo-payment-requests", workOrderId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("supplier_payment_requests")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!workOrderId,
    refetchInterval: 10000,
  });

  const generateLink = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("wo-supplier-magic-link", {
        body: { work_order_id: workOrderId, expires_in_days: 7 },
      });
      if (error) throw error;
      setMagicLink(data.link);
      await navigator.clipboard.writeText(data.link).catch(() => {});
      toast.success("Supplier portal link generated and copied (valid 7 days)");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const submitReview = async (req: any) => {
    if (reviewAction === "reject" && !reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setWorking(true);
    try {
      const update: any = {
        status: reviewAction === "approve" ? "approved" : "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (reviewAction === "reject") update.rejection_reason = reason;
      if (reviewAction === "approve" && paymentRef) update.payment_reference = paymentRef;

      const { error } = await (supabase as any)
        .from("supplier_payment_requests")
        .update(update)
        .eq("id", req.id);
      if (error) throw error;

      // Notify supplier in the WO message thread
      await (supabase as any).from("wo_supplier_messages").insert({
        organization_id: organizationId,
        work_order_id: workOrderId,
        sender_type: "fleet_team",
        sender_id: user?.id,
        sender_name: user?.email || "Fleet Team",
        message:
          reviewAction === "approve"
            ? `Payment request of ${req.currency} ${req.amount} APPROVED${
                paymentRef ? ` (Ref: ${paymentRef})` : ""
              }.`
            : `Payment request of ${req.currency} ${req.amount} REJECTED. Reason: ${reason}`,
      });

      toast.success(`Payment request ${reviewAction === "approve" ? "approved" : "rejected"}`);
      setReviewingId(null);
      setReason("");
      setPaymentRef("");
      qc.invalidateQueries({ queryKey: ["wo-payment-requests", workOrderId] });
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to update request");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Magic-link generator */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm">
            <p className="font-medium flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> External Supplier Access
            </p>
            <p className="text-xs text-muted-foreground">
              Generate a secure link so the outsourced service provider can view this WO, chat, and submit invoices.
            </p>
          </div>
          <Button size="sm" onClick={generateLink} disabled={generating}>
            {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <LinkIcon className="w-3 h-3 mr-1" />}
            Generate Supplier Link
          </Button>
        </CardContent>
        {magicLink && (
          <CardContent className="px-3 pb-3 pt-0">
            <div className="flex items-center gap-2 text-xs bg-background border rounded p-2">
              <code className="flex-1 truncate">{magicLink}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  navigator.clipboard.writeText(magicLink);
                  toast.success("Copied");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(magicLink, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Payment requests review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Supplier Payment Requests
            <Badge variant="outline" className="ml-auto text-[10px]">
              {payments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No payment requests submitted by the supplier yet.
            </p>
          )}
          {payments.map((p: any) => (
            <div key={p.id} className="border rounded-md p-3 space-y-2 bg-muted/20">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <p className="font-semibold">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.supplier_name || "Supplier"} · Invoice {p.invoice_number || "—"} ·{" "}
                    {format(new Date(p.created_at), "PP")}
                  </p>
                  {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
                </div>
                <Badge variant="outline" className={STATUS_COLORS[p.status] || ""}>
                  {p.status}
                </Badge>
              </div>

              {/* Attached docs */}
              <div className="flex flex-wrap gap-2">
                {p.invoice_url && (
                  <a
                    href={p.invoice_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 text-xs underline text-primary"
                  >
                    <FileText className="w-3 h-3" /> Invoice
                  </a>
                )}
                {Array.isArray(p.supporting_documents) &&
                  p.supporting_documents.map((d: any, i: number) => (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-xs underline"
                    >
                      <FileText className="w-3 h-3" /> {d.name || `Doc ${i + 1}`}
                    </a>
                  ))}
              </div>

              {/* Review action */}
              {p.status === "submitted" && reviewingId !== p.id && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      setReviewingId(p.id);
                      setReviewAction("approve");
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 gap-1"
                    onClick={() => {
                      setReviewingId(p.id);
                      setReviewAction("reject");
                    }}
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                </div>
              )}

              {reviewingId === p.id && (
                <div className="space-y-2 border-t pt-2">
                  {reviewAction === "approve" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Payment reference (optional)</Label>
                      <Input
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="TXN-12345 / cheque #"
                        className="h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Rejection reason *</Label>
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        className="text-xs"
                        placeholder="Document missing, amount mismatch, etc."
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7"
                      onClick={() => submitReview(p)}
                      disabled={working}
                    >
                      {working && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Confirm {reviewAction === "approve" ? "Approval" : "Rejection"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => {
                        setReviewingId(null);
                        setReason("");
                        setPaymentRef("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {p.status === "approved" && p.payment_reference && (
                <p className="text-[10px] text-muted-foreground">Ref: {p.payment_reference}</p>
              )}
              {p.status === "rejected" && p.rejection_reason && (
                <p className="text-[10px] text-destructive">Reason: {p.rejection_reason}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Communication thread */}
      <WorkOrderMessageThread
        workOrderId={workOrderId}
        organizationId={organizationId}
        senderType="fleet_team"
      />
    </div>
  );
}
