import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import { accentTokenFor } from "../nodeAccents";
import type { WorkflowNodeData } from "../types";

const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const token = accentTokenFor("triggers", nodeData.nodeType);
  return (
    <NodeShell data={nodeData} selected={selected} accentToken={token} shape="trigger">
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-card"
        style={{ backgroundColor: `hsl(var(${token}))` }}
      />
    </NodeShell>
  );
});

TriggerNode.displayName = "TriggerNode";
export default TriggerNode;
