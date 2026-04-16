import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileWarning, Users, Building2, Shield, Banknote, Wrench, ShoppingCart, Scale } from "lucide-react";
import {
  useThirdPartyClaimWorkflow,
  ClaimStage,
  ClaimLane,
  STAGE_LABEL,
  STAGE_LANES,
  ThirdPartyClaim,
} from "@/hooks/useThirdPartyClaimWorkflow";
import { NewThirdPartyClaimDialog } from "@/components/third-party-claims/NewThirdPartyClaimDialog";
import { ClaimDetailDrawer } from "@/components/third-party-claims/ClaimDetailDrawer";
import { format } from "date-fns";

const LANES: { id: ClaimLane; label: string; icon: any; stages: ClaimStage[] }[] = [
  { id: "fleet_ops", label: "Fleet Operation", icon: Users, stages: ["driver_report", "claim_notification", "vehicle_handover"] },
  { id: "supplier_garage", label: "Selected Supplier Garage", icon: Wrench, stages: ["supplier_notification", "repair_in_progress", "repair_completed"] },
  { id: "fleet_maintenance", label: "Fleet Maintenance", icon: Building2, stages: ["wo_verification", "vehicle_returned", "not_covered_end"] },
  { id: "insurance_mgmt", label: "Insurance Management", icon: Shield, stages: ["completeness_review", "policy_coverage_check", "quotation_selection", "receipt_signed", "salvage_recovery", "compensation_request", "third_party_negotiation", "legal_outcome", "document_archived", "closed"] },
  { id: "disbursement", label: "Disbursement / Finance", icon: Banknote, stages: ["payment_processing", "finance_collection", "amount_collected"] },
  { id: "fleet_sourcing", label: "Fleet Sourcing / SCM", icon: ShoppingCart, stages: ["request_quotations"] },
  { id: "legal", label: "Legal Division", icon: Scale, stages: ["legal_division"] },
];

export default function ThirdPartyClaims() {
  const { claims, isLoading } = useThirdPartyClaimWorkflow();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<ThirdPartyClaim | null>(null);

  const claimsByStage = claims.reduce((acc, c) => {
    (acc[c.workflow_stage] ||= []).push(c);
    return acc;
  }, {} as Record<ClaimStage, ThirdPartyClaim[]>);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileWarning className="w-7 h-7 text-warning" />
            <div>
              <h1 className="text-2xl font-bold">Third-Party Damage Claims</h1>
              <p className="text-sm text-muted-foreground">Ethio Telecom 20-step workflow — police report to legal outcome.</p>
            </div>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New claim
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {LANES.map(lane => {
            const count = lane.stages.reduce((n, s) => n + (claimsByStage[s]?.length ?? 0), 0);
            const Icon = lane.icon;
            return (
              <Card key={lane.id}>
                <CardContent className="p-3 flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{lane.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Swimlane view */}
        <div className="space-y-3">
          {LANES.map(lane => {
            const Icon = lane.icon;
            return (
              <Card key={lane.id}>
                <CardHeader className="py-3 bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {lane.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {lane.stages.map(stage => {
                      const items = claimsByStage[stage] ?? [];
                      return (
                        <div key={stage} className="border rounded p-2 min-h-[120px] bg-background">
                          <div className="flex items-center justify-between mb-2 gap-1">
                            <p className="text-[11px] font-semibold leading-tight">{STAGE_LABEL[stage]}</p>
                            <Badge variant="secondary">{items.length}</Badge>
                          </div>
                          <div className="space-y-2">
                            {items.length === 0 && <p className="text-[10px] text-muted-foreground italic">Empty</p>}
                            {items.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setSelected(c)}
                                className="w-full text-left border rounded p-2 hover:bg-accent hover:border-primary transition text-xs"
                              >
                                <p className="font-semibold truncate">{c.claim_number}</p>
                                <p className="text-muted-foreground truncate">{c.third_party_name || "TP unknown"}</p>
                                <p className="text-[10px] text-muted-foreground">{format(new Date(c.accident_date), "PP")}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isLoading && <p className="text-sm text-center text-muted-foreground py-6">Loading…</p>}
        {!isLoading && claims.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            No third-party claims yet. Click <strong>New claim</strong> to file one.
          </CardContent></Card>
        )}
      </div>

      <NewThirdPartyClaimDialog open={newOpen} onOpenChange={setNewOpen} />
      <ClaimDetailDrawer claim={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </Layout>
  );
}
