// Drop-in page wrapper. A SOP "page" is just <WorkflowPage config={...} /> + Layout.
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useWorkflow } from "./useWorkflow";
import { WorkflowSwimlane } from "./WorkflowSwimlane";
import { NewWorkflowDialog } from "./NewWorkflowDialog";
import { WorkflowDetailDrawer } from "./WorkflowDetailDrawer";
import type { WorkflowConfig, WorkflowInstance } from "./types";

interface Props {
  config: WorkflowConfig;
}

export function WorkflowPage({ config }: Props) {
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
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-sm text-muted-foreground">
              {config.sopCode} — {config.description}
            </p>
          </div>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> File new
        </Button>
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
