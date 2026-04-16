import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, ArrowRight, FileText, Clock, AlertTriangle } from "lucide-react";
import {
  InternalAccidentClaim,
  InternalStage,
  STAGE_LABEL,
  useInternalAccidentWorkflow,
  useInternalClaimTransitions,
} from "@/hooks/useInternalAccidentWorkflow";
import { format } from "date-fns";

interface Props { claim: InternalAccidentClaim | null; onOpenChange: (v: boolean) => void; }

export function InternalClaimDrawer({ claim, onOpenChange }: Props) {
  const { transition } = useInternalAccidentWorkflow();
  const { data: transitions = [] } = useInternalClaimTransitions(claim?.id ?? null);
  const [notes, setNotes] = useState("");
  const [field, setField] = useState<Record<string, string>>({});

  if (!claim) return null;

  const setF = (k: string, v: string) => setField(p => ({ ...p, [k]: v }));
  const f = (k: string) => field[k] ?? "";

  const move = async (to_stage: InternalStage, decision?: string, patch?: any) => {
    await transition.mutateAsync({ id: claim.id, to_stage, decision, notes: notes || undefined, patch });
    setNotes("");
    setField({});
  };

  const renderStageActions = () => {
    switch (claim.workflow_stage) {
      case "driver_report":
        return (
          <Button onClick={() => move("fleet_ops_analysis", "forward")}>
            Submit to Fleet Operations <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        );
      case "fleet_ops_analysis":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 2 — Fleet Operation analyzes the document and accident.</p>
            <Button onClick={() => move("coverage_decision", "forward")}>
              Analysis complete <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "coverage_decision":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Decision — Is the accident covered by insurance?</p>
            <Textarea rows={2} value={f("cov")} onChange={e => setF("cov", e.target.value)} placeholder="Coverage analysis notes…" />
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("covered_redirect", "yes", {
                covered_by_insurance: true, coverage_notes: f("cov") || null,
              })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Covered → Route to TP/Comprehensive (ERM-INM 06)
              </Button>
              <Button onClick={() => move("negligence_check", "no", {
                covered_by_insurance: false, coverage_notes: f("cov") || null,
              })}>
                Not covered → Negligence check <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        );
      case "negligence_check":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 3 — Did driver negligence cause the accident?</p>
            <Textarea rows={2} value={f("neg")} onChange={e => setF("neg", e.target.value)} placeholder="Negligence findings…" />
            <div className="flex gap-2 flex-wrap">
              <Button variant="destructive" onClick={() => move("discipline_action", "yes", {
                negligence_found: true, negligence_notes: f("neg") || null,
                discipline_action_reference: f("ref") || null,
              })}>
                <AlertTriangle className="w-4 h-4 mr-1" /> Yes → Discipline Action
              </Button>
              <Button onClick={() => move("consolidation", "no", {
                negligence_found: false, negligence_notes: f("neg") || null,
              })}>
                No negligence → Consolidate <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        );
      case "consolidation":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 4 — Consolidate information; accident not covered, maintained by Ethio Telecom.</p>
            <Textarea rows={2} value={f("cons")} onChange={e => setF("cons", e.target.value)} placeholder="Consolidation notes…" />
            <Button onClick={() => move("contract_check", "forward", { consolidation_notes: f("cons") || null })}>
              Send to Fleet Maintenance <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "contract_check":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 5 — Identify whether damaged parts can be maintained per existing contract.</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("use_existing_contract", "yes", {
                existing_contract_found: true,
              })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Yes → FMG-FMG 05 (Use existing contract)
              </Button>
              <Button onClick={() => move("supplier_short_list", "no", { existing_contract_found: false })}>
                No contract → Procurement <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        );
      case "supplier_short_list":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SCM-SPR 01 — Sourcing builds supplier short list. Step 6 — Request maintenance service procurement.</p>
            <div>
              <Label>Procurement request #</Label>
              <Input value={f("pr")} onChange={e => setF("pr", e.target.value)} placeholder="e.g. PR-2026-0042" />
            </div>
            <Button onClick={() => move("procurement_management", "forward", {
              procurement_request_number: f("pr") || null,
            })}>
              Short list ready <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "procurement_management":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SCM-PRO 01 — Procurement Management evaluates and selects supplier.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Selected supplier / partner</Label>
                <Input value={f("sup")} onChange={e => setF("sup", e.target.value)} />
              </div>
              <div>
                <Label>Supplier contact</Label>
                <Input value={f("contact")} onChange={e => setF("contact", e.target.value)} />
              </div>
              <div>
                <Label>Estimated cost (ETB)</Label>
                <Input type="number" value={f("est")} onChange={e => setF("est", e.target.value)} />
              </div>
              <div>
                <Label>Approved cost (ETB)</Label>
                <Input type="number" value={f("appr")} onChange={e => setF("appr", e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("supplier_notification", "complete", {
              selected_supplier: f("sup") || null,
              selected_supplier_contact: f("contact") || null,
              estimated_cost: f("est") ? Number(f("est")) : null,
              approved_cost: f("appr") ? Number(f("appr")) : null,
            })} disabled={!f("sup")}>
              Supplier selected <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "supplier_notification":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 7 — Notify selected supplier / partner. Issue PO.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>PO #</Label>
                <Input value={f("po")} onChange={e => setF("po", e.target.value)} />
              </div>
              <div>
                <Label>PO document URL</Label>
                <Input value={f("pourl")} onChange={e => setF("pourl", e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("maintenance_followup", "complete", {
              po_number: f("po") || null,
              po_url: f("pourl") || null,
              po_approved_at: new Date().toISOString(),
            })} disabled={!f("po")}>
              Supplier notified, PO issued <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "maintenance_followup":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 8 — Follow-up maintenance as per PO.</p>
            <Textarea rows={2} value={f("fu")} onChange={e => setF("fu", e.target.value)} placeholder="Follow-up notes…" />
            <Button onClick={() => move("maintenance_complete_check", "forward", {
              follow_up_notes: f("fu") || null,
            })}>
              Maintenance update <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "maintenance_complete_check":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Decision — Is maintenance complete?</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("maintenance_followup", "no", { is_complete: false })}>
                <XCircle className="w-4 h-4 mr-1" /> Not complete — keep following up
              </Button>
              <Button onClick={() => move("scd_confirmation", "yes", {
                is_complete: true,
                maintenance_completed_at: new Date().toISOString(),
              })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Complete → SCD confirmation
              </Button>
            </div>
          </div>
        );
      case "scd_confirmation":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 9 — Provide confirmation to SCD (Supply Chain Dept).</p>
            <div>
              <Label>Confirmation document URL</Label>
              <Input value={f("scd")} onChange={e => setF("scd", e.target.value)} />
            </div>
            <Button onClick={() => move("service_confirmation", "forward", {
              scd_confirmation_url: f("scd") || null,
            })}>
              Send to Sourcing for service confirmation <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "service_confirmation":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SCM-PRO 05 — Service or work delivery confirmation (PO or contract). Final step.</p>
            <Button onClick={() => move("closed", "complete")}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Close case
            </Button>
          </div>
        );
      case "covered_redirect":
        return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> ERM-INM 06 — Routed to Third-Party / Comprehensive Coverage</Badge>;
      case "discipline_action":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Routed to Employee Discipline Action Procedure</Badge>;
      case "use_existing_contract":
        return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> FMG-FMG 05 — Maintained per existing contract</Badge>;
      case "closed":
        return <Badge variant="secondary">Case closed{claim.closed_at && ` on ${format(new Date(claim.closed_at), "PP")}`}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={!!claim} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5" />
            {claim.claim_number}
            <Badge>{STAGE_LABEL[claim.workflow_stage]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Claim summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {format(new Date(claim.accident_date), "PP p")}</div>
            <div><span className="text-muted-foreground">Location:</span> {claim.accident_location || "—"}</div>
            <div><span className="text-muted-foreground">Supervisor:</span> {claim.supervisor_name || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {claim.status}</div>
            {claim.selected_supplier && <div><span className="text-muted-foreground">Supplier:</span> {claim.selected_supplier}</div>}
            {claim.po_number && <div><span className="text-muted-foreground">PO #:</span> {claim.po_number}</div>}
            {claim.estimated_cost != null && <div><span className="text-muted-foreground">Est. cost:</span> {claim.estimated_cost.toLocaleString()} ETB</div>}
            {claim.approved_cost != null && <div><span className="text-muted-foreground">Approved:</span> {claim.approved_cost.toLocaleString()} ETB</div>}
            {claim.discipline_action_reference && <div className="col-span-2"><span className="text-muted-foreground">Discipline ref:</span> {claim.discipline_action_reference}</div>}
            {claim.report_document_url && (
              <div className="col-span-2 truncate">
                <span className="text-muted-foreground">Report:</span>{" "}
                <a href={claim.report_document_url} target="_blank" rel="noreferrer" className="text-primary underline">{claim.report_document_url}</a>
              </div>
            )}
          </div>

          <Separator />

          {/* Stage actions */}
          <div>
            <h4 className="font-semibold mb-2">Current stage actions</h4>
            <div className="bg-muted/40 p-3 rounded space-y-2">
              {renderStageActions()}
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this transition…" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Audit trail */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Workflow history</h4>
            <ScrollArea className="h-48 border rounded p-2">
              {transitions.length === 0 && <p className="text-xs text-muted-foreground">No history yet.</p>}
              {transitions.map(t => (
                <div key={t.id} className="text-xs border-b py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {t.from_stage ? `${STAGE_LABEL[t.from_stage as InternalStage] ?? t.from_stage} → ` : ""}
                      {STAGE_LABEL[t.to_stage as InternalStage] ?? t.to_stage}
                    </span>
                    <span className="text-muted-foreground">{format(new Date(t.created_at), "PP p")}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {t.performed_by_name} {t.decision && <Badge variant="outline" className="ml-1 text-[10px]">{t.decision}</Badge>}
                  </div>
                  {t.notes && <p className="italic mt-1">{t.notes}</p>}
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
