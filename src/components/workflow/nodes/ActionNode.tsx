import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import { accentTokenFor } from "../nodeAccents";
import type { WorkflowNodeData } from "../types";

const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const token = accentTokenFor(nodeData.category, nodeData.nodeType);
  return (
    <NodeShell data={nodeData} selected={selected} accentToken={token} shape="rect">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-card"
        style={{ backgroundColor: `hsl(var(${token}))` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-card"
        style={{ backgroundColor: `hsl(var(${token}))` }}
      />
    </NodeShell>
  );
});

ActionNode.displayName = "ActionNode";
export default ActionNode;
