import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "TB" | "LR";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

/**
 * Auto-layouts nodes/edges using dagre.
 * Returns NEW node objects with updated positions; edges are returned as-is.
 */
export function autoLayout<TN extends Node, TE extends Edge>(
  nodes: TN[],
  edges: TE[],
  direction: LayoutDirection = "TB",
): { nodes: TN[]; edges: TE[] } {
  if (nodes.length === 0) return { nodes, edges };

  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });

  nodes.forEach((n) => {
    g.setNode(n.id, {
      width: (n.width as number | undefined) ?? NODE_WIDTH,
      height: (n.height as number | undefined) ?? NODE_HEIGHT,
    });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      // dagre returns center; React Flow expects top-left
      position: { x: pos.x - ((n.width as number | undefined) ?? NODE_WIDTH) / 2, y: pos.y - ((n.height as number | undefined) ?? NODE_HEIGHT) / 2 },
    } as TN;
  });

  return { nodes: laidOut, edges };
}

/**
 * Detects orphan / unreachable nodes and basic configuration problems.
 * Returns a list of issues per node.
 */
export interface CanvasProblem {
  nodeId: string;
  message: string;
}
export function findProblems<TN extends Node, TE extends Edge>(nodes: TN[], edges: TE[]): CanvasProblem[] {
  const problems: CanvasProblem[] = [];
  const incoming = new Set(edges.map((e) => e.target));
  const outgoing = new Set(edges.map((e) => e.source));

  for (const n of nodes) {
    const data = n.data as any;
    const isTrigger = data?.category === "triggers";
    if (!isTrigger && !incoming.has(n.id)) {
      problems.push({ nodeId: n.id, message: "Unreachable — has no incoming edge." });
    }
    if (isTrigger && !outgoing.has(n.id) && nodes.length > 1) {
      problems.push({ nodeId: n.id, message: "Trigger has no outgoing edge." });
    }
  }
  return problems;
}
