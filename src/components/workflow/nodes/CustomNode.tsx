import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import TriggerNode from "./TriggerNode";
import ConditionNode from "./ConditionNode";
import ActionNode from "./ActionNode";
import type { WorkflowNodeData } from "../types";

/**
 * Dispatcher for legacy/migrated nodes saved with type "custom".
 * Routes to the correct visual node based on data.category so older
 * workflows render with the proper styling instead of falling back to
 * ReactFlow's default (blank white) node.
 */
const CustomNode = memo((props: NodeProps) => {
  const data = props.data as unknown as WorkflowNodeData;
  const category = data?.category;

  if (category === "triggers") return <TriggerNode {...props} />;
  if (category === "conditions") return <ConditionNode {...props} />;
  return <ActionNode {...props} />;
});

CustomNode.displayName = "CustomNode";
export default CustomNode;
