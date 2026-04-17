import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { WorkflowNodeData } from "../types";

const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  return (
    <div
      className={cn(
        "relative min-w-[220px] max-w-[260px] rounded-xl border bg-popover text-popover-foreground shadow-md ring-1 ring-emerald-500/15 transition-all duration-200",
        selected
          ? "border-primary ring-primary/20 shadow-xl scale-[1.02]"
          : "border-emerald-500 hover:shadow-lg",
        nodeData.status === "running" && "animate-pulse border-yellow-500",
        nodeData.status === "success" && "border-emerald-500",
        nodeData.status === "error" && "border-destructive"
      )}
    >
      {/* Top accent bar */}
      <div className="h-1.5 w-full rounded-t-[10px] bg-gradient-to-r from-emerald-400 to-teal-500" />

      <div className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-base">
            {nodeData.icon || "⚡"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Trigger
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground break-words">
              {nodeData.label}
            </div>
          </div>
          {nodeData.isConfigured && (
            <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" title="Configured" />
          )}
        </div>
        {nodeData.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {nodeData.description}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background"
      />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
export default TriggerNode;
