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
  ThirdPartyClaim,
  STAGE_LABEL,
  ClaimStage,
  useThirdPartyClaimWorkflow,
  useClaimTransitions,
} from "@/hooks/useThirdPartyClaimWorkflow";
import { format } from "date-fns";

interface Props { claim: ThirdPartyClaim | null; onOpenChange: (v: boolean) => void; }

export function ClaimDetailDrawer({ claim, onOpenChange }: Props) {
  const { transition } = useThirdPartyClaimWorkflow();
  const { data: transitions = [] } = useClaimTransitions(claim?.id ?? null);
  const [notes, setNotes] = useState("");
  const [field, setField] = useState<Record<string, string>>({});

  if (!claim) return null;

  const setF = (k: string, v: string) => setField(p => ({ ...p, [k]: v }));
  const f = (k: string) => field[k] ?? "";

  const move = async (to_stage: ClaimStage, decision?: string, patch?: any) => {
    await transition.mutateAsync({ id: claim.id, to_stage, decision, notes: notes || undefined, patch });
    setNotes("");
    setField({});
  };

  const renderStageActions = () => {
    switch (claim.workflow_stage) {
      case "driver_report":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 1 — Driver reports incident to police, obtains police report.</p>
            <div>
              <Label>Police report #</Label>
              <Input value={f("prn")} onChange={e => setF("prn", e.target.value)} placeholder="Enter police report number" />
            </div>
            <Button onClick={() => move("claim_notification", "complete", { police_report_number: f("prn") || claim.police_report_number })}
              disabled={!f("prn") && !claim.police_report_number}>
              Police report obtained <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "claim_notification":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 2 — Driver fills Internal Claim Notification Form with Fleet Inspector and sends accident report.</p>
            <Button onClick={() => move("completeness_review", "forward")}>
              Submit to Insurance Management <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "completeness_review":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 3 — Insurance Mgmt analyzes claim notification.</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("claim_notification", "reject", { completeness_check: "incomplete" })}>
                <XCircle className="w-4 h-4 mr-1" /> Incomplete — return
              </Button>
              <Button onClick={() => move("policy_coverage_check", "approve", { completeness_check: "complete" })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Complete — proceed
              </Button>
            </div>
          </div>
        );
      case "policy_coverage_check":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Decision — Is the damage covered by insurance policy?</p>
            <Textarea rows={2} value={f("policy")} onChange={e => setF("policy", e.target.value)} placeholder="Policy analysis notes…" />
            <div className="flex gap-2 flex-wrap">
              <Button variant="destructive" onClick={() => move("not_covered_end", "no", {
                covered_by_policy: false, policy_analysis_notes: f("policy") || null,
              })}>
                <XCircle className="w-4 h-4 mr-1" /> Not covered (FMG-FMG 18)
              </Button>
              <Button onClick={() => move("request_quotations", "yes", {
                covered_by_policy: true, policy_analysis_notes: f("policy") || null,
              })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Covered → Request quotations
              </Button>
            </div>
          </div>
        );
      case "request_quotations":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 4 — Fleet Sourcing requests quotations from approved garages (third party / customer garage).</p>
            <div>
              <Label># quotations received</Label>
              <Input type="number" value={f("qcount")} onChange={e => setF("qcount", e.target.value)} />
            </div>
            <Button onClick={() => move("quotation_selection", "forward", {
              quotation_count: f("qcount") ? Number(f("qcount")) : null,
            })}>
              Send quotations to Insurance Mgmt <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "quotation_selection":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 5 — Select least-price quotation and communicate via email.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Selected supplier garage</Label>
                <Input value={f("garage")} onChange={e => setF("garage", e.target.value)} />
              </div>
              <div>
                <Label>Quotation amount (ETB)</Label>
                <Input type="number" value={f("qamount")} onChange={e => setF("qamount", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Supplier contact</Label>
                <Input value={f("contact")} onChange={e => setF("contact", e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("supplier_notification", "complete", {
              selected_supplier_garage: f("garage") || null,
              selected_supplier_contact: f("contact") || null,
              quotation_amount: f("qamount") ? Number(f("qamount")) : null,
            })} disabled={!f("garage") || !f("qamount")}>
              Confirm selection <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "supplier_notification":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 6a — Inform winner garage to conduct repair with Third Party / Insurance. Step 6b — Provide pro forma invoice to Insurance Mgmt.</p>
            <div>
              <Label>Pro forma invoice URL</Label>
              <Input value={f("pf")} onChange={e => setF("pf", e.target.value)} placeholder="Document URL" />
            </div>
            <Button onClick={() => move("vehicle_handover", "complete", { pro_forma_invoice_url: f("pf") || null })}>
              Notification done <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "vehicle_handover":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 7 — Hand over vehicle to winner / supplier garage with Fleet Maintenance / Regional Fleet Operation. Approved Work Order.</p>
            <div>
              <Label>Work Order #</Label>
              <Input value={f("wo")} onChange={e => setF("wo", e.target.value)} />
            </div>
            <Button onClick={() => move("repair_in_progress", "complete", {
              work_order_number: f("wo") || null,
              work_order_approved_at: new Date().toISOString(),
              repair_status: "in_progress",
            })} disabled={!f("wo")}>
              Vehicle handed over <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "repair_in_progress":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Steps 8 & 9 — Garage receives vehicle, maintains as per WO. Fleet Maintenance follows up.</p>
            <Button onClick={() => move("repair_completed", "complete", {
              repair_status: "completed",
              payment_requested_by_garage_at: new Date().toISOString(),
            })}>
              Garage reports completion + payment request <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "repair_completed":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 10 — Garage reports maintenance completed, requests payment.</p>
            <Button onClick={() => move("wo_verification", "forward")}>
              Send to Fleet Maintenance for verification <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "wo_verification":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 11 — Check if maintenance is performed as per Work Order. (OK?)</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("vehicle_returned", "no", { maintenance_per_wo_ok: false })}>
                <XCircle className="w-4 h-4 mr-1" /> Not OK — return to garage
              </Button>
              <Button onClick={() => move("payment_processing", "yes", { maintenance_per_wo_ok: true })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> OK — proceed to payment
              </Button>
            </div>
          </div>
        );
      case "vehicle_returned":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 12 — Vehicle returned to garage for rework.</p>
            <Button onClick={() => move("repair_in_progress", "forward", { repair_status: "rework" })}>
              Rework in progress <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "payment_processing":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 13a — Disbursement provides original payment receipt to Insurance Mgmt. Step 13b — Inform to collect maintained vehicle & salvage.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Settlement amount</Label>
                <Input type="number" value={f("samt")} onChange={e => setF("samt", e.target.value)} />
              </div>
              <div>
                <Label>Receipt URL</Label>
                <Input value={f("rcp")} onChange={e => setF("rcp", e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("receipt_signed", "complete", {
              settlement_amount: f("samt") ? Number(f("samt")) : null,
              payment_receipt_url: f("rcp") || null,
            })} disabled={!f("samt")}>
              Payment processed <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "receipt_signed":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 15 — Insurance Mgmt signs copy of receipt, collects original.</p>
            <Button onClick={() => move("salvage_recovery", "complete")}>
              Receipt signed <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "salvage_recovery":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 14 — Collect maintained vehicle & recovery / salvage from garage and return to third party.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Salvage value (ETB)</Label>
                <Input type="number" value={f("sval")} onChange={e => setF("sval", e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={f("snote")} onChange={e => setF("snote", e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("compensation_request", "complete", {
              salvage_collected: true,
              salvage_value: f("sval") ? Number(f("sval")) : null,
              salvage_notes: f("snote") || null,
            })}>
              Salvage collected <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "compensation_request":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 16 — Request claim compensation from third party or its insurer.</p>
            <Button onClick={() => move("third_party_negotiation", "forward")}>
              Compensation requested <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "third_party_negotiation":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Decision — Did third party agree?</p>
            <div>
              <Label>Agreed amount (ETB)</Label>
              <Input type="number" value={f("aamt")} onChange={e => setF("aamt", e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="destructive" onClick={() => move("legal_division", "no", { third_party_agreed: false })}>
                <XCircle className="w-4 h-4 mr-1" /> Not agreed → Legal Division
              </Button>
              <Button onClick={() => move("finance_collection", "yes", {
                third_party_agreed: true,
                agreed_amount: f("aamt") ? Number(f("aamt")) : null,
              })} disabled={!f("aamt")}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Agreed → Inform Finance
              </Button>
            </div>
          </div>
        );
      case "finance_collection":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 17 — Inform Finance to collect agreed amount.</p>
            <Button onClick={() => move("amount_collected", "forward")}>
              Send to Disbursement <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "amount_collected":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 18 — Collect agreed amount from third party / insurer.</p>
            <div>
              <Label>Amount collected (ETB)</Label>
              <Input type="number" value={f("camt")} onChange={e => setF("camt", e.target.value)} />
            </div>
            <Button onClick={() => move("document_archived", "complete", {
              collected_from_third_party: f("camt") ? Number(f("camt")) : null,
            })} disabled={!f("camt")}>
              Amount collected <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "legal_division":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SER-LGM 06 — Legal Division represents Ethio Telecom as plaintiff.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Legal case #</Label>
                <Input value={f("lcase")} onChange={e => setF("lcase", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={f("lstatus")} onChange={e => setF("lstatus", e.target.value)} placeholder="filed / hearing / judgment" />
              </div>
            </div>
            <Button onClick={() => move("legal_outcome", "forward", {
              legal_case_number: f("lcase") || null,
              legal_status: f("lstatus") || null,
            })} disabled={!f("lcase")}>
              Case filed → Awaiting outcome <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "legal_outcome":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 20 — Inform result to Insurance Management Section.</p>
            <Textarea rows={2} value={f("lout")} onChange={e => setF("lout", e.target.value)} placeholder="Legal outcome / judgment details…" />
            <Button onClick={() => move("document_archived", "complete", { legal_outcome: f("lout") || null })}>
              Outcome recorded <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "document_archived":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 19 — Update / archive the document.</p>
            <Button onClick={() => move("closed", "complete")}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Close claim
            </Button>
          </div>
        );
      case "not_covered_end":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" /> FMG-FMG 18 — Not covered by insurance (terminal)
          </Badge>
        );
      case "closed":
        return <Badge variant="secondary">Claim closed{claim.settled_at && ` on ${format(new Date(claim.settled_at), "PP")}`}</Badge>;
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
            <div><span className="text-muted-foreground">Police report:</span> {claim.police_report_number || "—"}</div>
            <div><span className="text-muted-foreground">Third party:</span> {claim.third_party_name || "—"}</div>
            <div><span className="text-muted-foreground">TP vehicle:</span> {claim.third_party_vehicle || "—"}</div>
            <div><span className="text-muted-foreground">TP insurance:</span> {claim.third_party_insurance || "—"}</div>
            {claim.selected_supplier_garage && (
              <div><span className="text-muted-foreground">Garage:</span> {claim.selected_supplier_garage}</div>
            )}
            {claim.work_order_number && (
              <div><span className="text-muted-foreground">WO #:</span> {claim.work_order_number}</div>
            )}
            {claim.quotation_amount != null && (
              <div><span className="text-muted-foreground">Quotation:</span> {claim.quotation_amount.toLocaleString()} ETB</div>
            )}
            {claim.settlement_amount != null && (
              <div><span className="text-muted-foreground">Settled:</span> {claim.settlement_amount.toLocaleString()} ETB</div>
            )}
            {claim.salvage_value != null && (
              <div><span className="text-muted-foreground">Salvage:</span> {claim.salvage_value.toLocaleString()} ETB</div>
            )}
            {claim.agreed_amount != null && (
              <div><span className="text-muted-foreground">Agreed:</span> {claim.agreed_amount.toLocaleString()} ETB</div>
            )}
            {claim.collected_from_third_party != null && (
              <div><span className="text-muted-foreground">Collected:</span> {claim.collected_from_third_party.toLocaleString()} ETB</div>
            )}
            {claim.legal_case_number && (
              <div><span className="text-muted-foreground">Legal case:</span> {claim.legal_case_number}</div>
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
                      {t.from_stage ? `${STAGE_LABEL[t.from_stage as ClaimStage] ?? t.from_stage} → ` : ""}
                      {STAGE_LABEL[t.to_stage as ClaimStage] ?? t.to_stage}
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
