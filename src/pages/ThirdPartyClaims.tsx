import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileWarning, Users, Building2, Shield, Banknote } from "lucide-react";
import {
  useThirdPartyClaimWorkflow,
  ClaimStage,
  STAGE_LABEL,
  STAGE_LANES,
  ThirdPartyClaim,
} from "@/hooks/useThirdPartyClaimWorkflow";
import { NewThirdPartyClaimDialog } from "@/components/third-party-claims/NewThirdPartyClaimDialog";
import { ClaimDetailDrawer } from "@/components/third-party-claims/ClaimDetailDrawer";
import { format } from "date-fns";

const LANES: { id: typeof STAGE_LANES[ClaimStage]; label: string; icon: any; stages: ClaimStage[] }[] = [
  { id: "driver", label: "Driver", icon: Users, stages: ["driver_report", "claim_notification"] },
  { id: "fleet_ops", label: "Fleet Operation", icon: Building2, stages: ["completeness_review", "documents_sent"] },
  { id: "ap_disbursement", label: "Account Payable / Finance", icon: Banknote, stages: ["ap_processing"] },
  { id: "insurance_mgmt", label: "Insurance Management", icon: Shield, stages: ["insurance_processing", "finance_settlement", "notification_letter", "closed"] },
  { id: "insurance_co", label: "Insurance Company", icon: FileWarning, stages: ["third_party_dealing"] },
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
              <h1 className="text-2xl font-bold">Third-Party Fault Claims</h1>
              <p className="text-sm text-muted-foreground">Ethio Telecom claim workflow — driver to insurance company to settlement.</p>
            </div>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New claim
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {LANES.map(lane => {
            const count = lane.stages.reduce((n, s) => n + (claimsByStage[s]?.length ?? 0), 0);
            const Icon = lane.icon;
            return (
              <Card key={lane.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{lane.label}</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {lane.stages.map(stage => {
                      const items = claimsByStage[stage] ?? [];
                      return (
                        <div key={stage} className="border rounded p-2 min-h-[120px] bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold">{STAGE_LABEL[stage]}</p>
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
