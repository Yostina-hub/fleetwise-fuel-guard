import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardCheck, FileText, ShoppingCart, Receipt, Banknote, Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STAGES = [
  { key: "awaiting_approval", label: "Awaiting approval",    icon: ClipboardCheck, next: "rfq",      nextLabel: "Approve & open RFQ" },
  { key: "rfq",               label: "RFQ to suppliers",     icon: FileText,       next: "quotes",   nextLabel: "Quotes received" },
  { key: "quotes",            label: "Quotes received",      icon: FileText,       next: "supplier", nextLabel: "Select supplier" },
  { key: "supplier",          label: "Supplier selected",    icon: ShoppingCart,   next: "po",       nextLabel: "Issue PO" },
  { key: "po",                label: "PO issued",            icon: ShoppingCart,   next: "invoice",  nextLabel: "Invoice received" },
  { key: "invoice",           label: "Invoice received",     icon: Receipt,        next: "payment",  nextLabel: "Pay supplier" },
  { key: "payment",           label: "Payment processed",    icon: Banknote,       next: "closed",   nextLabel: "Capture Bolo & close" },
  { key: "closed",            label: "Bolo issued — closed", icon: Award,          next: null,       nextLabel: null },
];

const stageIndex = (s?: string | null) => Math.max(0, STAGES.findIndex(x => x.key === s));

export default function AnnualInspectionPipeline() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeForm, setCloseForm] = useState({
    registration_cost: "",
    registration_date: format(new Date(), "yyyy-MM-dd"),
    registration_valid_until: "",
    inspection_center: "",
    bolo_certificate_url: "",
    plate_sticker_number: "",
    notes: "",
  });
  const [submittingClose, setSubmittingClose] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["annual-inspections-pipeline", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select(`
          id, vehicle_id, status, outsource_stage, work_order_id,
          registration_cost, registration_date, registration_valid_until,
          inspection_center, bolo_certificate_url, plate_sticker_number,
          inspection_date, created_at,
          vehicles ( plate_number, make, model )
        `)
        .eq("organization_id", organizationId)
        .eq("inspection_type", "annual")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const advanceStage = async (item: any) => {
    const idx = stageIndex(item.outsource_stage);
    const next = STAGES[idx]?.next;
    if (!next) return;
    if (next === "closed") {
      setClosingId(item.id);
      setCloseForm(c => ({ ...c, inspection_center: item.inspection_center || "" }));
      return;
    }
    setAdvancingId(item.id);
    try {
      const { error } = await supabase
        .from("vehicle_inspections")
        .update({ outsource_stage: next })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(`Advanced to ${STAGES.find(s => s.key === next)?.label}`);
      qc.invalidateQueries({ queryKey: ["annual-inspections-pipeline"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to advance");
    } finally {
      setAdvancingId(null);
    }
  };

  const submitClose = async () => {
    if (!closingId) return;
    if (!closeForm.registration_cost || !closeForm.registration_date) {
      toast.error("Registration cost and date are required to close");
      return;
    }
    setSubmittingClose(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("vehicle_inspections")
        .update({
          outsource_stage: "closed",
          status: "completed",
          registration_cost: Number(closeForm.registration_cost),
          registration_date: closeForm.registration_date,
          registration_valid_until: closeForm.registration_valid_until || null,
          inspection_center: closeForm.inspection_center || null,
          bolo_certificate_url: closeForm.bolo_certificate_url || null,
          plate_sticker_number: closeForm.plate_sticker_number || null,
          mechanic_notes: closeForm.notes || null,
          closed_by_initiator_at: new Date().toISOString(),
          closed_by_initiator: userData.user?.id || null,
          certified_safe: true,
        })
        .eq("id", closingId);
      if (error) throw error;

      // Close the linked work order too
      const item = items.find((i: any) => i.id === closingId);
      if (item?.work_order_id) {
        await supabase.from("work_orders").update({
          status: "completed",
          completed_date: new Date().toISOString(),
          total_cost: Number(closeForm.registration_cost),
        }).eq("id", item.work_order_id);
      }

      toast.success("Annual inspection closed — Bolo recorded");
      setClosingId(null);
      setCloseForm({
        registration_cost: "",
        registration_date: format(new Date(), "yyyy-MM-dd"),
        registration_valid_until: "",
        inspection_center: "",
        bolo_certificate_url: "",
        plate_sticker_number: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["annual-inspections-pipeline"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to close");
    } finally {
      setSubmittingClose(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-center text-muted-foreground py-6">Loading annual pipeline…</p>;
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No annual inspection requests in the pipeline yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item: any) => {
          const stage = item.outsource_stage || "awaiting_approval";
          const idx = stageIndex(stage);
          const current = STAGES[idx];
          const Icon = current?.icon || ClipboardCheck;
          return (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">
                        {item.vehicles?.plate_number || "—"}{" "}
                        <span className="text-muted-foreground font-normal">
                          {item.vehicles?.make} {item.vehicles?.model}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Filed {format(new Date(item.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={stage === "closed" ? "default" : "outline"} className="capitalize">
                    {current?.label}
                  </Badge>
                </div>

                {/* Stage timeline */}
                <div className="grid grid-cols-8 gap-1">
                  {STAGES.map((s, i) => (
                    <div
                      key={s.key}
                      className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`}
                      title={s.label}
                    />
                  ))}
                </div>

                {item.registration_cost ? (
                  <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                    <span>Bolo cost: <strong className="text-foreground">{Number(item.registration_cost).toLocaleString()} ETB</strong></span>
                    <span>Issued: <strong className="text-foreground">{item.registration_date}</strong></span>
                    {item.registration_valid_until && <span>Valid until: <strong className="text-foreground">{item.registration_valid_until}</strong></span>}
                    {item.plate_sticker_number && <span>Sticker: <strong className="text-foreground">{item.plate_sticker_number}</strong></span>}
                  </div>
                ) : null}

                {current?.next && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => advanceStage(item)} disabled={advancingId === item.id}>
                      {advancingId === item.id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      {current.nextLabel}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Close & capture Bolo dialog */}
      <Dialog open={!!closingId} onOpenChange={(v) => !v && setClosingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Annual Registration (Bolo) & Close</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Registration cost (ETB) *</Label>
                <Input type="number" value={closeForm.registration_cost}
                  onChange={e => setCloseForm(c => ({ ...c, registration_cost: e.target.value }))} />
              </div>
              <div>
                <Label>Registration date *</Label>
                <Input type="date" value={closeForm.registration_date}
                  onChange={e => setCloseForm(c => ({ ...c, registration_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid until</Label>
                <Input type="date" value={closeForm.registration_valid_until}
                  onChange={e => setCloseForm(c => ({ ...c, registration_valid_until: e.target.value }))} />
              </div>
              <div>
                <Label>Plate sticker no.</Label>
                <Input value={closeForm.plate_sticker_number}
                  onChange={e => setCloseForm(c => ({ ...c, plate_sticker_number: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Inspection center</Label>
              <Input value={closeForm.inspection_center}
                onChange={e => setCloseForm(c => ({ ...c, inspection_center: e.target.value }))} />
            </div>
            <div>
              <Label>Bolo certificate URL</Label>
              <Input value={closeForm.bolo_certificate_url} placeholder="https://…"
                onChange={e => setCloseForm(c => ({ ...c, bolo_certificate_url: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={closeForm.notes}
                onChange={e => setCloseForm(c => ({ ...c, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingId(null)}>Cancel</Button>
            <Button onClick={submitClose} disabled={submittingClose}>
              {submittingClose && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Close & record Bolo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
