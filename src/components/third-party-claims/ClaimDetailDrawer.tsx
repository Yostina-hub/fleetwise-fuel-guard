import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, ArrowRight, FileText, Clock } from "lucide-react";
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
  const [estimatedCost, setEstimatedCost] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementRef, setSettlementRef] = useState("");

  if (!claim) return null;

  const move = async (to_stage: ClaimStage, decision?: any, patch?: any) => {
    await transition.mutateAsync({ id: claim.id, to_stage, decision, notes: notes || undefined, patch });
    setNotes("");
  };

  const renderStageActions = () => {
    switch (claim.workflow_stage) {
      case "driver_report":
        return (
          <div className="space-y-2">
            <Label>Police report number</Label>
            <Input value={claim.police_report_number ?? ""} disabled placeholder="Add via edit form" />
            <Button onClick={() => move("claim_notification", "complete")} disabled={!claim.police_report_number}>
              Mark police report obtained <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "claim_notification":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Driver completes Internal Claim Notification Form with Fleet Inspector.</p>
            <Button onClick={() => move("completeness_review", "forward")}>
              Submit to Fleet Operation <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "completeness_review":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 3 — Fleet Operation reviews claim notification for completeness.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => move("claim_notification", "reject")}>
                <XCircle className="w-4 h-4 mr-1" /> Incomplete — return to driver
              </Button>
              <Button onClick={() => move("documents_sent", "approve")}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Complete & correct
              </Button>
            </div>
          </div>
        );
      case "documents_sent":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 4 — Fleet Operation sends claim documents to Insurance Management.</p>
            <Button onClick={() => move("insurance_processing", "forward")}>
              Forward to Insurance Mgmt <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "insurance_processing":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step 5 — Insurance Mgmt completes claim form, sends to insurance company. Decide if covered.</p>
            <div>
              <Label>Estimated repair cost (ETB)</Label>
              <Input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => move("finance_settlement", "no", {
                within_insurance_coverage: false,
                estimated_repair_cost: estimatedCost ? Number(estimatedCost) : null,
              })}>
                Not within coverage → Finance
              </Button>
              <Button onClick={() => move("third_party_dealing", "yes", {
                within_insurance_coverage: true,
                estimated_repair_cost: estimatedCost ? Number(estimatedCost) : null,
              })}>
                Within coverage → Insurance Co. <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        );
      case "third_party_dealing":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step 6 — Insurance company deals with third party. Confirm if within limit.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => move("closed", "yes", { within_limit: true })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Within limit — close
              </Button>
              <Button onClick={() => move("finance_settlement", "no", { within_limit: false })}>
                Exceeds limit → Finance settles
              </Button>
            </div>
          </div>
        );
      case "finance_settlement":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step 7 — Inform Finance to settle payment with necessary documents.</p>
            <Button onClick={() => move("ap_processing", "forward")}>
              Send to Account Payable (FAM-APY 01) <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "ap_processing":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">FAM-APY 01 — Account Payable Section processes payment.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Settlement amount</Label>
                <Input type="number" value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} />
              </div>
              <div>
                <Label>Payment reference</Label>
                <Input value={settlementRef} onChange={e => setSettlementRef(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => move("notification_letter", "complete", {
              settlement_amount: settlementAmount ? Number(settlementAmount) : null,
              settlement_reference: settlementRef || null,
            })} disabled={!settlementAmount}>
              Payment processed <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      case "notification_letter":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Step 8 — Send notification letter to concerned Fleet Operation Management.</p>
            <Button onClick={() => move("closed", "complete")}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Letter sent — close claim
            </Button>
          </div>
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
          <DialogTitle className="flex items-center gap-2">
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
