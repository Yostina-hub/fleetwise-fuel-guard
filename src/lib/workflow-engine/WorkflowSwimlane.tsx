// Reusable swimlane Kanban + summary view used by all 14 SOP workflow pages.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { WorkflowConfig, WorkflowInstance } from "./types";

interface Props {
  config: WorkflowConfig;
  instances: WorkflowInstance[];
  onSelect: (i: WorkflowInstance) => void;
}

export function WorkflowSwimlane({ config, instances, onSelect }: Props) {
  const byStage = instances.reduce((acc, i) => {
    (acc[i.current_stage] ||= []).push(i);
    return acc;
  }, {} as Record<string, WorkflowInstance[]>);

  return (
    <div className="space-y-3">
      {config.lanes.map((lane) => {
        const Icon = lane.icon;
        const laneStages = config.stages.filter((s) => s.lane === lane.id);
        const laneCount = laneStages.reduce(
          (n, s) => n + (byStage[s.id]?.length ?? 0),
          0,
        );
        return (
          <Card key={lane.id}>
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                {Icon ? <Icon className="w-4 h-4" /> : null}
                {lane.label}
                <Badge variant="outline" className="ml-auto">
                  {laneCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {laneStages.map((stage) => {
                  const items = byStage[stage.id] ?? [];
                  return (
                    <div
                      key={stage.id}
                      className="border rounded p-2 min-h-[120px] bg-background"
                    >
                      <div className="flex items-center justify-between mb-2 gap-1">
                        <p className="text-[11px] font-semibold leading-tight">
                          {stage.label}
                        </p>
                        <Badge variant="secondary">{items.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Empty
                          </p>
                        )}
                        {items.map((i) => (
                          <button
                            key={i.id}
                            onClick={() => onSelect(i)}
                            className="w-full text-left border rounded p-2 hover:bg-accent hover:border-primary transition text-xs"
                          >
                            <p className="font-semibold truncate">
                              {i.reference_number}
                            </p>
                            <p className="text-muted-foreground truncate">
                              {i.title || i.description || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(i.created_at), "PP")}
                            </p>
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
  );
}
