// Detail drawer with stage actions, role-gated buttons, and audit history.
//
// Delegation-matrix integration: when the current stage is an approval stage
// (id ends in "_pending_approval"), the resolver looks up the authority_matrix
// for this org/workflow and dynamically narrows which roles can approve/reject.
// A small badge surfaces the rule source so operators can audit the decision.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Lock, CheckCircle2, History as HistoryIcon, ExternalLink, ShieldCheck } from "lucide-react";
import { WorkflowFieldset } from "./WorkflowFieldset";
import { useWorkflow, useWorkflowTransitions } from "./useWorkflow";
import { useApproverResolution, isApprovalStage } from "./useApproverResolution";
import { VehicleHandoverHistoryDiff } from "@/components/workflow/VehicleHandoverHistoryDiff";
import type { WorkflowConfig, WorkflowInstance, StageAction } from "./types";

interface Props {
  config: WorkflowConfig;
  instance: WorkflowInstance | null;
  onOpenChange: (v: boolean) => void;
}

export function WorkflowDetailDrawer({ config, instance, onOpenChange }: Props) {
  const { performAction, canPerform } = useWorkflow(config);
  const { data: transitions = [] } = useWorkflowTransitions(instance?.id ?? null);
  const [activeAction, setActiveAction] = useState<StageAction | null>(null);
  const [actionValues, setActionValues] = useState<Record<string, any>>({});
  const [actionNotes, setActionNotes] = useState("");

  if (!instance) return null;
  const stage = config.stages.find((s) => s.id === instance.current_stage);
  const lane = config.lanes.find((l) => l.id === instance.current_lane);
  const isCompleted = instance.status === "completed";

  const submitAction = async () => {
    if (!activeAction) return;
    const missing = (activeAction.fields || [])
      .filter((f) => f.required)
      .filter((f) => !actionValues[f.key] && actionValues[f.key] !== false);
    if (missing.length) return;
    if (activeAction.confirm && !window.confirm(activeAction.confirm)) return;

    await performAction.mutateAsync({
      instance,
      action: activeAction,
      payload: actionValues,
      notes: actionNotes,
    });
    setActiveAction(null);
    setActionValues({});
    setActionNotes("");
  };

  return (
    <Sheet open={!!instance} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {instance.reference_number}
            <Badge variant={isCompleted ? "default" : "secondary"}>
              {isCompleted ? "Completed" : "In progress"}
            </Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {config.sopCode} • {config.title}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Current stage" value={stage?.label || instance.current_stage} />
            <Info label="Current lane" value={lane?.label || instance.current_lane || "—"} />
            <Info label="Title" value={instance.title || "—"} />
            <Info label="Created" value={format(new Date(instance.created_at), "PPp")} />
          </div>

          {instance.description ? (
            <div>
              <p className="text-xs font-semibold mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {instance.description}
              </p>
            </div>
          ) : null}

          {config.type === "fleet_inspection" && (instance.data as any)?.inspection_id ? (
            <div className="rounded-md border bg-muted/40 p-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                Linked operational record in <strong>Vehicle Inspections</strong>.
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to={`/vehicle-inspections?inspection=${(instance.data as any).inspection_id}`}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Open inspection
                </Link>
              </Button>
            </div>
          ) : null}

          <Separator />

          <Tabs defaultValue="actions">
            <TabsList>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="data">Form data</TabsTrigger>
              <TabsTrigger value="history">
                <HistoryIcon className="w-3 h-3 mr-1" /> History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-3 mt-3">
              {isCompleted ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="w-4 h-4" /> Workflow completed.
                </div>
              ) : !stage?.actions?.length ? (
                <p className="text-sm text-muted-foreground">No actions available.</p>
              ) : activeAction ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{activeAction.label}</p>
                  {activeAction.fields?.length ? (
                    <WorkflowFieldset
                      fields={activeAction.fields}
                      values={actionValues}
                      onChange={(k, v) => setActionValues((p) => ({ ...p, [k]: v }))}
                    />
                  ) : null}
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add a note for the audit log"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={submitAction}
                      disabled={performAction.isPending}
                    >
                      Confirm {activeAction.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveAction(null);
                        setActionValues({});
                        setActionNotes("");
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Pick the next step:
                  </p>
                  {stage.actions.map((a) => {
                    const allowed = canPerform(a);
                    return (
                      <Button
                        key={a.id}
                        variant={a.variant || "default"}
                        className="w-full justify-between"
                        disabled={!allowed}
                        onClick={() => setActiveAction(a)}
                      >
                        <span>{a.label}</span>
                        {!allowed ? (
                          <span className="text-[10px] flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {a.allowedRoles?.join(" / ")}
                          </span>
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="data" className="mt-3 space-y-3">
              {config.type === "vehicle_handover" ? (
                <div>
                  <p className="text-xs font-semibold mb-2">History comparison</p>
                  <VehicleHandoverHistoryDiff instance={instance} />
                </div>
              ) : null}
              <pre className="text-[11px] bg-muted/50 p-2 rounded overflow-auto max-h-96">
                {JSON.stringify(instance.data || {}, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="history" className="mt-3 space-y-2">
              {transitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                transitions.map((t) => (
                  <div key={t.id} className="border rounded p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {t.from_stage ? `${t.from_stage} → ` : ""}
                        {t.to_stage}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(t.created_at), "PPp")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {t.performed_by_name || "Unknown"}
                      {t.performed_by_role ? ` (${t.performed_by_role})` : ""} •{" "}
                      {t.decision || "—"}
                    </p>
                    {t.notes ? <p className="mt-1">{t.notes}</p> : null}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
