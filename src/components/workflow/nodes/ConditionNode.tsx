import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "../types";

const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-xl border-2 bg-card shadow-lg transition-all duration-200",
        selected ? "border-primary shadow-primary/20 shadow-xl scale-105" : "border-amber-500/50 hover:shadow-xl",
        nodeData.status === "running" && "animate-pulse border-yellow-500",
        nodeData.status === "error" && "border-destructive"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
      />

      <div className="h-1.5 w-full rounded-t-[10px] bg-gradient-to-r from-amber-400 to-orange-500" />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-lg">
            {nodeData.icon || "🔀"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Condition
            </div>
            <div className="text-sm font-medium truncate text-foreground">
              {nodeData.label}
            </div>
          </div>
        </div>
        {nodeData.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {nodeData.description}
          </p>
        )}
      </div>

      {/* True/False handles */}
      <div className="flex justify-between px-4 pb-2">
        <span className="text-[10px] font-medium text-emerald-500">✓ True</span>
        <span className="text-[10px] font-medium text-red-500">✗ False</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-[70%]"
      />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
export default ConditionNode;
