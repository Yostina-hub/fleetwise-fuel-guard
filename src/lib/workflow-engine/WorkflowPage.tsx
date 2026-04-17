// Drop-in page wrapper. A SOP "page" is just <WorkflowPage config={...} /> + Layout.
//
// Phase D — When the org has a seeded/edited graph in the `workflows` table,
// the operational config (stages + actions) comes from the builder via
// useEffectiveConfig, so editing the workflow visually changes the SOP's
// behavior end-to-end. The legacy hardcoded `config` is the fallback.
//
// Phase E — Adds governance: shows a drift indicator when the DB graph has
// diverged from the canonical baseline (configs.ts) and lets authorized
// users seed/restore the SOP from baseline in one click.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Sparkles, AlertTriangle, RotateCcw, Download } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "./useWorkflow";
import { WorkflowSwimlane } from "./WorkflowSwimlane";
import { NewWorkflowDialog } from "./NewWorkflowDialog";
import { WorkflowDetailDrawer } from "./WorkflowDetailDrawer";
import { useEffectiveConfig } from "./useEffectiveConfig";
import { seedSingleSOP } from "./sopGovernance";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import type { WorkflowConfig, WorkflowInstance } from "./types";

interface Props {
  config: WorkflowConfig;
  /** Optional extra action button rendered next to "File new" (e.g. EBS Create Work Request CTA). */
  extraAction?: React.ReactNode;
}

export function WorkflowPage({ config: baseConfig, extraAction }: Props) {
  const { organizationId } = useOrganization();
  const { user, hasRole } = useAuth() as any;
  const queryClient = useQueryClient();

  // Resolve the effective config (DB graph if seeded, otherwise hardcoded).
  const {
    config,
    fromBuilder,
    workflowId,
    drifted,
    driftReasons,
    refetch,
  } = useEffectiveConfig(baseConfig);

  const { instances, isLoading } = useWorkflow(config);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<WorkflowInstance | null>(null);
  const Icon = config.icon;

  // Seed/restore is only offered to operators who can manage workflows.
  const canManage =
    typeof hasRole === "function"
      ? hasRole("super_admin") ||
        hasRole("fleet_owner") ||
        hasRole("operations_manager") ||
        hasRole("fleet_manager")
      : false;

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization selected");
      return seedSingleSOP(organizationId, baseConfig, user?.id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      refetch();
      toast.success(
        res.inserted ? `${baseConfig.sopCode} seeded` : `${baseConfig.sopCode} restored from baseline`,
      );
    },
    onError: (e: any) => toast.error(e?.message || "Seed failed"),
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="w-7 h-7 text-primary" /> : null}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{config.title}</h1>
              {fromBuilder && !drifted && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Builder-driven
                </Badge>
              )}
              {fromBuilder && drifted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] border-warning/50 text-warning"
                      >
                        <AlertTriangle className="h-3 w-3" /> Drifted
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">DB graph differs from baseline</p>
                      <ul className="text-xs list-disc pl-4 space-y-0.5">
                        {driftReasons.slice(0, 4).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                        {driftReasons.length > 4 && (
                          <li>…and {driftReasons.length - 4} more</li>
                        )}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!fromBuilder && canManage && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Download className="h-3 w-3" /> Not seeded
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {config.sopCode} — {config.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {extraAction}

          {/* Seed (if missing) — one-click for operators. */}
          {!fromBuilder && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {seedMutation.isPending ? "Seeding…" : "Seed to builder"}
            </Button>
          )}

          {/* Restore from baseline — guarded by a confirm dialog because it overwrites. */}
          {fromBuilder && drifted && canManage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Restore baseline
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore {baseConfig.sopCode} from baseline?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This overwrites the current builder graph for this SOP with the canonical
                    baseline shipped in code. In-flight workflow instances are not affected
                    — only the structure of <strong>future runs</strong> changes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => seedMutation.mutate()}>
                    Restore now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {fromBuilder && workflowId && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/workflow-builder?edit=${workflowId}`}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit in builder
              </Link>
            </Button>
          )}
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> File new
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-center text-muted-foreground py-6">Loading…</p>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {config.title.toLowerCase()} yet. Click <strong>File new</strong> to start.
          </CardContent>
        </Card>
      ) : (
        <WorkflowSwimlane
          config={config}
          instances={instances}
          onSelect={setSelected}
        />
      )}

      <NewWorkflowDialog config={config} open={newOpen} onOpenChange={setNewOpen} />
      <WorkflowDetailDrawer
        config={config}
        instance={selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
