import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, FileText, X } from "lucide-react";

interface Props {
  workOrderId: string;
  organizationId: string;
  portalToken?: string;
  onSubmitted?: () => void;
}

interface Doc { name: string; url: string; }

export function SupplierPaymentRequestForm({ workOrderId, organizationId, portalToken, onSubmitted }: Props) {
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("ETB");
  const [notes, setNotes] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setUploading(true);
    try {
      let url = "";
      if (portalToken) {
        const fd = new FormData();
        fd.append("file", file);
        const ep = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-portal?action=upload_file`;
        const r = await fetch(ep, { method: "POST", headers: { "x-portal-token": portalToken }, body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        url = d.signed_url;
      } else {
        const path = `wo/${workOrderId}/payment/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("supplier-documents").upload(path, file);
        if (error) throw error;
        const { data } = await supabase.storage.from("supplier-documents").createSignedUrl(path, 60 * 60 * 24 * 30);
        url = data?.signedUrl || "";
      }
      setDocs((prev) => [...prev, { name: file.name, url }]);
      toast.success("Document attached");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (docs.length === 0) { toast.error("Attach at least one supporting document (e.g., invoice)"); return; }
    setSubmitting(true);
    try {
      if (portalToken) {
        const ep = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wo-supplier-portal?action=submit_payment_request`;
        const r = await fetch(ep, {
          method: "POST",
          headers: { "x-portal-token": portalToken, "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_number: invoice || null,
            invoice_url: docs[0].url,
            amount, currency, notes,
            supporting_documents: docs,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
      } else {
        const { error } = await (supabase as any).from("supplier_payment_requests").insert({
          organization_id: organizationId,
          work_order_id: workOrderId,
          invoice_number: invoice || null,
          invoice_url: docs[0].url,
          amount, currency, notes,
          status: "submitted",
          supporting_documents: docs,
        });
        if (error) throw error;
      }
      toast.success("Payment request submitted to fleet team");
      setInvoice(""); setAmount(0); setNotes(""); setDocs([]);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit Payment Request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Invoice #</Label>
            <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="INV-2025-001" />
          </div>
          <div className="space-y-1">
            <Label>Amount *</Label>
            <Input type="number" min={0} step="0.01" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-32" />
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Description of services rendered…" />
        </div>

        <div className="space-y-2">
          <Label>Supporting documents *</Label>
          <input type="file" ref={fileRef} onChange={upload} className="hidden" accept="image/*,application/pdf" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Attach Invoice / Receipt
          </Button>
          {docs.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
              <a href={d.url} target="_blank" rel="noopener" className="flex items-center gap-2 underline truncate">
                <FileText className="w-4 h-4" /> {d.name}
              </a>
              <Button variant="ghost" size="icon" onClick={() => setDocs((p) => p.filter((_, j) => j !== i))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Payment Request
        </Button>
        <p className="text-xs text-muted-foreground">The fleet maintenance team will review the attached document and approve or reject your payment.</p>
      </CardContent>
    </Card>
  );
}
