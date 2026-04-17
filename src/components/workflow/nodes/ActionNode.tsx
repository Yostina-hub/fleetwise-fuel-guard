import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "../types";

const CATEGORY_COLORS: Record<string, { gradient: string; border: string; text: string; ring: string }> = {
  fleet: {
    gradient: "from-blue-400 to-indigo-500",
    border: "border-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/10",
  },
  notifications: {
    gradient: "from-violet-400 to-purple-500",
    border: "border-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/10",
  },
  data: {
    gradient: "from-cyan-400 to-blue-500",
    border: "border-cyan-500",
    text: "text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500/10",
  },
  timing: {
    gradient: "from-slate-400 to-gray-500",
    border: "border-slate-500",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/10",
  },
  actions: {
    gradient: "from-pink-400 to-rose-500",
    border: "border-pink-500",
    text: "text-pink-600 dark:text-pink-400",
    ring: "ring-pink-500/10",
  },
};

const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const colors = CATEGORY_COLORS[nodeData.category] || CATEGORY_COLORS.actions;

  return (
    <div
      className={cn(
        "relative min-w-[220px] max-w-[260px] rounded-xl border bg-popover text-popover-foreground shadow-md ring-1 transition-all duration-200",
        selected
          ? "border-primary ring-primary/20 shadow-xl scale-[1.02]"
          : `${colors.border} ${colors.ring} hover:shadow-lg`,
        nodeData.status === "running" && "animate-pulse border-yellow-500",
        nodeData.status === "success" && "border-emerald-500",
        nodeData.status === "error" && "border-destructive"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      <div className={cn("h-1.5 w-full rounded-t-[10px] bg-gradient-to-r", colors.gradient)} />

      <div className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
            {nodeData.icon || "⚙️"}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("text-[10px] font-semibold uppercase tracking-wider", colors.text)}>
              {nodeData.category === "fleet" ? "Fleet" :
               nodeData.category === "notifications" ? "Notify" :
               nodeData.category === "data" ? "Data" :
               nodeData.category === "timing" ? "Timing" : "Action"}
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
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});

ActionNode.displayName = "ActionNode";
export default ActionNode;
