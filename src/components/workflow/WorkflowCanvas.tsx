import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import TEMPLATES from "./workflowTemplates";
import {
  ReactFlow,
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
import { WorkflowSimulator } from "./WorkflowSimulator";
import { WorkflowAICommandBar, type AIWorkflowResult } from "./WorkflowAICommandBar";
import { WorkflowTemplateGallery } from "./WorkflowTemplateGallery";
import TriggerNode from "./nodes/TriggerNode";
import ConditionNode from "./nodes/ConditionNode";
import ActionNode from "./nodes/ActionNode";
import CustomNode from "./nodes/CustomNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { autoLayout, findProblems, type LayoutDirection } from "./canvasLayout";
import { accentTokenFor } from "./nodeAccents";
import type { PaletteItem, WorkflowNode, WorkflowEdge } from "./types";
import type { WorkflowTemplate } from "./workflowTemplates";
import { AnimatePresence } from "framer-motion";
import { friendlyToastError } from "@/lib/errorMessages";

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  custom: CustomNode,
};

function getNodeTypeForCategory(category: string) {
  if (category === "triggers") return "trigger";
  if (category === "conditions") return "condition";
  return "action";
}

let nodeIdCounter = 0;

function WorkflowCanvasInner({ editWorkflowId }: { editWorkflowId?: string | null }) {
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
  const [cronExpression, setCronExpression] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(editWorkflowId || null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAICommandBar, setShowAICommandBar] = useState(false);

  // Load existing workflow when editing — scoped to organization
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editWorkflowId || !organizationId || loadedRef.current === editWorkflowId) return;
    loadedRef.current = editWorkflowId;
    setIsLoading(true);
    supabase
      .from("workflows")
      .select("*")
      .eq("id", editWorkflowId)
      .eq("organization_id", organizationId)
      .single()
      .then(({ data, error }) => {
        setIsLoading(false);
        if (error || !data) {
          friendlyToastError(null, { title: "Workflow not found in this organization" });
          return;
        }
        setWorkflowName(data.name);
        setWorkflowStatus(data.status);
        setWorkflowId(data.id);
        setCronExpression((data as any).cron_expression || "");
        if (Array.isArray(data.nodes)) setNodes(data.nodes as any);
        if (Array.isArray(data.edges)) setEdges(data.edges as any);
        setTimeout(() => fitView({ padding: 0.2 }), 200);
      });
  }, [editWorkflowId, organizationId, toast, setNodes, setEdges, fitView]);

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
      // Color the edge after the source node's category accent for clarity.
      const srcNode = nodes.find((n) => n.id === params.source);
      const srcData = srcNode?.data as any;
      const token = accentTokenFor(srcData?.category, srcData?.nodeType);
      const stroke = `hsl(var(${token}))`;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: stroke },
            style: { strokeWidth: 2, stroke },
          },
          eds,
        ),
      );
    },
    [setEdges, pushHistory, nodes],
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
      toast({ title: "Node Added", description: `${item.label} added to canvas` });
    },
    [screenToFlowPosition, setNodes, toast, pushHistory]
  );

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node as WorkflowNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, newData: Partial<WorkflowNode["data"]>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
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

  const queryClient = useQueryClient();

  const handleSave = useCallback(async () => {
    if (!organizationId) {
      friendlyToastError(null, { title: "Organization not found" });
      return;
    }
    setIsSaving(true);
    try {
      const serializedNodes = JSON.parse(JSON.stringify(nodes));
      const serializedEdges = JSON.parse(JSON.stringify(edges));
      if (workflowId) {
        const { error } = await supabase
          .from("workflows")
          .update({
            name: workflowName,
            description: `Workflow with ${nodes.length} nodes and ${edges.length} connections`,
            nodes: serializedNodes,
            edges: serializedEdges,
            status: workflowStatus,
            cron_expression: cronExpression || null,
          } as any)
          .eq("id", workflowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workflows")
          .insert({
            organization_id: organizationId,
            name: workflowName,
            description: `Workflow with ${nodes.length} nodes and ${edges.length} connections`,
            nodes: serializedNodes,
            edges: serializedEdges,
            status: workflowStatus,
            cron_expression: cronExpression || null,
            created_by: user?.id,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        setWorkflowId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      toast({ title: "Saved!", description: "Workflow saved successfully" });
    } catch (error: any) {
      friendlyToastError(error);
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, workflowName, nodes, edges, workflowStatus, workflowId, user, toast, queryClient]);

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
        friendlyToastError(null, { title: "Invalid workflow file" });
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

  // Template loading
  const handleLoadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      pushHistory();
      setNodes(template.nodes as any);
      setEdges(template.edges as any);
      setWorkflowName(template.name);
      setShowTemplates(false);
      toast({
        title: "Template Loaded",
        description: `"${template.name}" loaded with ${template.nodes.length} nodes. You can now customize it!`,
      });
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [pushHistory, setNodes, setEdges, toast, fitView]
  );

  // Auto-load template from URL query param
  const [searchParams, setSearchParams] = useSearchParams();
  const templateLoadedRef = useRef(false);
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (templateId && !templateLoadedRef.current) {
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        templateLoadedRef.current = true;
        handleLoadTemplate(template);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, handleLoadTemplate, setSearchParams]);

  // Simulation node status
  const handleSimNodeStatus = useCallback(
    (nodeId: string, status: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
        )
      );
    },
    [setNodes]
  );

  // AI command bar result handler
  const handleAIResult = useCallback((result: AIWorkflowResult) => {
    pushHistory();
    if (result.action === "delete") {
      if (result.nodesToDelete) {
        setNodes((nds) => nds.filter((n) => !result.nodesToDelete!.includes(n.id)));
        setEdges((eds) => eds.filter((e) =>
          !result.nodesToDelete!.includes(e.source) && !result.nodesToDelete!.includes(e.target)
        ));
      }
      if (result.edgesToDelete) {
        setEdges((eds) => eds.filter((e) => !result.edgesToDelete!.includes(e.id)));
      }
    } else if (result.action === "modify") {
      if (result.nodes) setNodes(result.nodes as any);
      if (result.edges) setEdges(result.edges as any);
    } else if (result.action === "add_nodes") {
      if (result.nodes) setNodes((nds) => [...nds, ...(result.nodes as any)]);
      if (result.edges) setEdges((eds) => [...eds, ...(result.edges as any)]);
    } else {
      // generate, auto_maintenance, smart_decision
      if (result.nodes) setNodes(result.nodes as any);
      if (result.edges) setEdges(result.edges as any);
    }
    setTimeout(() => fitView({ padding: 0.2 }), 200);
  }, [pushHistory, setNodes, setEdges, fitView]);

  // Auto-layout (dagre)
  const handleAutoLayout = useCallback(
    (direction: LayoutDirection) => {
      if (nodes.length === 0) return;
      pushHistory();
      const { nodes: ln, edges: le } = autoLayout(nodes, edges, direction);
      setNodes(ln);
      setEdges(le);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
      toast({ title: "Auto-layout applied", description: `Arranged ${nodes.length} nodes ${direction === "TB" ? "vertically" : "horizontally"}.` });
    },
    [nodes, edges, setNodes, setEdges, pushHistory, fitView, toast],
  );

  // Validation problems (memoised)
  const problems = useMemo(() => findProblems(nodes, edges), [nodes, edges]);

  const jumpToProblem = useCallback((nodeId: string) => {
    const n = nodes.find((nn) => nn.id === nodeId);
    if (!n) return;
    setSelectedNode(n as WorkflowNode);
  }, [nodes]);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowAICommandBar(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <WorkflowToolbar
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        status={workflowStatus}
        onStatusChange={setWorkflowStatus}
        onSave={handleSave}
        onRun={() => setShowSimulator(!showSimulator)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2 })}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onDuplicate={handleDuplicate}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenAI={() => setShowAICommandBar(true)}
        isSaving={isSaving}
        isSimulating={showSimulator}
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
        <div className="flex-1 relative" ref={reactFlowWrapper}>
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
              markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
              style: { strokeWidth: 2, stroke: "hsl(var(--muted-foreground) / 0.4)" },
            }}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
            <MiniMap
              className="!bg-card/80 !border-border !rounded-lg !shadow-md !backdrop-blur"
              pannable
              zoomable
              nodeColor={(node) => {
                const d = node.data as any;
                if (d?.status === "running") return "hsl(var(--status-running))";
                if (d?.status === "success") return "hsl(var(--status-done))";
                if (d?.status === "error") return "hsl(var(--status-failed))";
                const token = accentTokenFor(d?.category, d?.nodeType);
                return `hsl(var(${token}))`;
              }}
              maskColor="hsl(var(--background) / 0.7)"
            />
          </ReactFlow>
          <CanvasToolbar
            onFitView={() => fitView({ padding: 0.2, duration: 400 })}
            onZoomIn={() => zoomIn()}
            onZoomOut={() => zoomOut()}
            onAutoLayout={handleAutoLayout}
            problems={problems}
            onJumpToProblem={jumpToProblem}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
        </div>

        {/* Right panel - Config, Simulator, or AI Chat */}
        <AnimatePresence mode="wait">
          {showAICommandBar && (
            <WorkflowAICommandBar
              key="ai-chat"
              open={showAICommandBar}
              onClose={() => setShowAICommandBar(false)}
              nodes={nodes}
              edges={edges}
              onApplyResult={handleAIResult}
            />
          )}
          {showSimulator && !showAICommandBar && (
            <WorkflowSimulator
              key="simulator"
              nodes={nodes}
              edges={edges}
              organizationId={organizationId}
              workflowId={workflowId}
              onNodeStatusChange={handleSimNodeStatus}
              onClose={() => {
                setShowSimulator(false);
                nodes.forEach((n) => handleSimNodeStatus(n.id, "idle"));
              }}
            />
          )}
          {selectedNode && !showSimulator && !showAICommandBar && (
            <WorkflowNodeConfig
              key="config"
              node={selectedNode}
              onUpdate={updateNodeData}
              onDelete={deleteNode}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Template Gallery Modal */}
      <AnimatePresence>
        {showTemplates && (
          <WorkflowTemplateGallery
            onSelectTemplate={handleLoadTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export const WorkflowCanvas = ({ editWorkflowId }: { editWorkflowId?: string | null }) => (
  <ReactFlowProvider>
    <WorkflowCanvasInner editWorkflowId={editWorkflowId} />
  </ReactFlowProvider>
);
