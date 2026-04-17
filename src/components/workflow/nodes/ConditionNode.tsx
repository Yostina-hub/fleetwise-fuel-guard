import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import { accentTokenFor } from "../nodeAccents";
import type { WorkflowNodeData } from "../types";

const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const token = accentTokenFor("conditions", nodeData.nodeType);

  const footer = (
    <div className="mt-2 flex items-center justify-between gap-2 px-1">
      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--status-done)/0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--status-done))]">
        ✓ True
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--status-failed)/0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--status-failed))]">
        ✗ False
      </span>
    </div>
  );

  return (
    <NodeShell data={nodeData} selected={selected} accentToken={token} shape="decision" footer={footer}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-card"
        style={{ backgroundColor: `hsl(var(${token}))` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !border-2 !border-card !left-[28%]"
        style={{ backgroundColor: "hsl(var(--status-done))" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !border-2 !border-card !left-[72%]"
        style={{ backgroundColor: "hsl(var(--status-failed))" }}
      />
    </NodeShell>
  );
});

ConditionNode.displayName = "ConditionNode";
export default ConditionNode;
