// Drop-in page wrapper. A SOP "page" is just <WorkflowPage config={...} /> + Layout.
//
// Phase D — When the org has a seeded/edited graph in the `workflows` table,
// the operational config (stages + actions) comes from the builder via
// useEffectiveConfig, so editing the workflow visually changes the SOP's
// behavior end-to-end. The legacy hardcoded `config` is the fallback.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Sparkles } from "lucide-react";
import { useWorkflow } from "./useWorkflow";
import { WorkflowSwimlane } from "./WorkflowSwimlane";
import { NewWorkflowDialog } from "./NewWorkflowDialog";
import { WorkflowDetailDrawer } from "./WorkflowDetailDrawer";
import { useEffectiveConfig } from "./useEffectiveConfig";
import type { WorkflowConfig, WorkflowInstance } from "./types";

interface Props {
  config: WorkflowConfig;
  /** Optional extra action button rendered next to "File new" (e.g. EBS Create Work Request CTA). */
  extraAction?: React.ReactNode;
}

export function WorkflowPage({ config: baseConfig, extraAction }: Props) {
  // Resolve the effective config (DB graph if seeded, otherwise hardcoded).
  const { config, fromBuilder, workflowId } = useEffectiveConfig(baseConfig);

  const { instances, isLoading } = useWorkflow(config);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<WorkflowInstance | null>(null);
  const Icon = config.icon;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="w-7 h-7 text-primary" /> : null}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{config.title}</h1>
              {fromBuilder && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Builder-driven
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {config.sopCode} — {config.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {extraAction}
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
