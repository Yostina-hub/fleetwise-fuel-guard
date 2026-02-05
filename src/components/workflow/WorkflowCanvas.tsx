import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type OnConnect,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WorkflowPalette } from "./WorkflowPalette";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowNodeConfig } from "./WorkflowNodeConfig";
import TriggerNode from "./nodes/TriggerNode";
import ConditionNode from "./nodes/ConditionNode";
import ActionNode from "./nodes/ActionNode";
import type { PaletteItem, WorkflowNode, WorkflowEdge } from "./types";

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

function getNodeTypeForCategory(category: string) {
  if (category === "triggers") return "trigger";
  if (category === "conditions") return "condition";
  return "action";
}

let nodeIdCounter = 0;

function WorkflowCanvasInner() {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [workflowStatus, setWorkflowStatus] = useState("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<Array<{ nodes: any[]; edges: any[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [nodes, edges, historyIndex]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      pushHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges, pushHistory]
  );

  const onDragStart = useCallback((event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      const item: PaletteItem = JSON.parse(data);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      pushHistory();

      const newNode: WorkflowNode = {
        id: `node_${++nodeIdCounter}_${Date.now()}`,
        type: getNodeTypeForCategory(item.category),
        position,
        data: {
          label: item.label,
          description: item.description,
          icon: item.icon,
          category: item.category,
          nodeType: item.type,
          config: item.defaultConfig || {},
          status: "idle",
          isConfigured: false,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      toast({
        title: "Node Added",
        description: `${item.label} added to canvas`,
      });
    },
    [screenToFlowPosition, setNodes, toast, pushHistory]
  );

  const onNodeClick = useCallback(
    (_: any, node: any) => {
      setSelectedNode(node as WorkflowNode);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, newData: Partial<WorkflowNode["data"]>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges, pushHistory]
  );

  const handleSave = useCallback(async () => {
    if (!organizationId) {
      toast({ title: "Error", description: "Organization not found", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const workflowData = {
        organization_id: organizationId,
        name: workflowName,
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        status: workflowStatus,
        created_by: user?.id,
      };

      if (workflowId) {
        const { error } = await supabase
          .from("workflows")
          .update(workflowData)
          .eq("id", workflowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workflows")
          .insert(workflowData)
          .select("id")
          .single();
        if (error) throw error;
        setWorkflowId(data.id);
      }

      toast({ title: "Saved!", description: "Workflow saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, workflowName, nodes, edges, workflowStatus, workflowId, user, toast]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryIndex((i) => i - 1);
  }, [history, historyIndex, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryIndex((i) => i + 1);
  }, [history, historyIndex, setNodes, setEdges]);

  const handleClear = useCallback(() => {
    pushHistory();
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges, pushHistory]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ name: workflowName, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflowName, nodes, edges]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.nodes && data.edges) {
          pushHistory();
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.name) setWorkflowName(data.name);
          toast({ title: "Imported", description: "Workflow loaded successfully" });
        }
      } catch {
        toast({ title: "Error", description: "Invalid workflow file", variant: "destructive" });
      }
    };
    input.click();
  }, [setNodes, setEdges, pushHistory, toast]);

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) return;
    pushHistory();
    const newNode = {
      ...selectedNode,
      id: `node_${++nodeIdCounter}_${Date.now()}`,
      position: { x: selectedNode.position.x + 50, y: selectedNode.position.y + 50 },
      data: { ...selectedNode.data },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [selectedNode, setNodes, pushHistory]);

  return (
    <div className="flex flex-col h-full">
      <WorkflowToolbar
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        status={workflowStatus}
        onStatusChange={setWorkflowStatus}
        onSave={handleSave}
        onRun={() => toast({ title: "Workflow Engine", description: "Execution engine coming soon!" })}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2 })}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onDuplicate={handleDuplicate}
        isSaving={isSaving}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-64 flex-shrink-0">
          <WorkflowPalette onDragStart={onDragStart} />
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
              style: { strokeWidth: 2 },
            }}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="!bg-background" />
            <Controls className="!bg-card !border-border !shadow-lg" />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={(node) => {
                const d = node.data as any;
                if (d?.category === "triggers") return "#10b981";
                if (d?.category === "conditions") return "#f59e0b";
                if (d?.category === "fleet") return "#3b82f6";
                if (d?.category === "notifications") return "#8b5cf6";
                if (d?.category === "data") return "#06b6d4";
                if (d?.category === "timing") return "#64748b";
                return "#6366f1";
              }}
              maskColor="hsl(var(--background) / 0.7)"
            />
          </ReactFlow>
        </div>

        {/* Right config panel */}
        {selectedNode && (
          <WorkflowNodeConfig
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

export const WorkflowCanvas = () => (
  <ReactFlowProvider>
    <WorkflowCanvasInner />
  </ReactFlowProvider>
);
