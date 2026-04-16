import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, User, Building2, Wrench, ShoppingCart } from "lucide-react";
import {
  useInternalAccidentWorkflow,
  InternalStage,
  InternalLane,
  STAGE_LABEL,
  InternalAccidentClaim,
} from "@/hooks/useInternalAccidentWorkflow";
import { NewInternalAccidentDialog } from "@/components/internal-accidents/NewInternalAccidentDialog";
import { InternalClaimDrawer } from "@/components/internal-accidents/InternalClaimDrawer";
import { format } from "date-fns";

const LANES: { id: InternalLane; label: string; icon: any; stages: InternalStage[] }[] = [
  { id: "driver", label: "Eligible Driver", icon: User, stages: ["driver_report"] },
  { id: "fleet_ops", label: "Fleet Operation Section", icon: Building2, stages: ["fleet_ops_analysis", "coverage_decision", "covered_redirect", "negligence_check", "discipline_action", "consolidation"] },
  { id: "fleet_maintenance", label: "Fleet Maintenance Section", icon: Wrench, stages: ["contract_check", "use_existing_contract", "maintenance_followup", "maintenance_complete_check", "scd_confirmation", "closed"] },
  { id: "sourcing", label: "Sourcing / Supply Chain", icon: ShoppingCart, stages: ["supplier_short_list", "procurement_management", "supplier_notification", "service_confirmation"] },
];

export default function InternalAccidentMaintenance() {
  const { claims, isLoading } = useInternalAccidentWorkflow();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<InternalAccidentClaim | null>(null);

  const claimsByStage = claims.reduce((acc, c) => {
    (acc[c.workflow_stage] ||= []).push(c);
    return acc;
  }, {} as Record<InternalStage, InternalAccidentClaim[]>);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Internal Accident Maintenance</h1>
              <p className="text-sm text-muted-foreground">FMG-FMG 18 — Vehicle accident maintenance NOT covered by insurance.</p>
            </div>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Report accident
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LANES.map(lane => {
            const count = lane.stages.reduce((n, s) => n + (claimsByStage[s]?.length ?? 0), 0);
            const Icon = lane.icon;
            return (
              <Card key={lane.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{lane.label}</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                                <p className="text-muted-foreground truncate">{c.accident_location || "—"}</p>
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
            No internal accident reports yet. Click <strong>Report accident</strong> to start.
          </CardContent></Card>
        )}
      </div>

      <NewInternalAccidentDialog open={newOpen} onOpenChange={setNewOpen} />
      <InternalClaimDrawer claim={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </Layout>
  );
}
