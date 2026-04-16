import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  ArrowUpDown,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { executeNode, type ExecutionResult } from "./workflowExecutor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SimulationLog {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeIcon: string;
  status: "running" | "success" | "error" | "skipped";
  message: string;
  timestamp: number;
  duration?: number;
  data?: Record<string, any>;
  operation?: string;
  table?: string;
  branch?: string;
}

interface WorkflowSimulatorProps {
  nodes: any[];
  edges: any[];
  organizationId: string;
  workflowId?: string | null;
  onNodeStatusChange: (nodeId: string, status: string) => void;
  onClose: () => void;
}

export const WorkflowSimulator = ({
  nodes,
  edges,
  organizationId,
  workflowId,
  onNodeStatusChange,
  onClose,
}: WorkflowSimulatorProps) => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [currentNodeIdx, setCurrentNodeIdx] = useState(-1);
  const [speed, setSpeed] = useState([1]);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [dbOpsCount, setDbOpsCount] = useState({ reads: 0, writes: 0 });
  const abortRef = useRef(false);
  const speedRef = useRef(speed);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Build adjacency list for conditional branching
  const buildGraph = useCallback(() => {
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const edgeMap = new Map<string, Array<{ target: string; sourceHandle?: string; label?: string }>>();

    nodes.forEach((n) => {
      adjList.set(n.id, []);
      inDegree.set(n.id, 0);
      edgeMap.set(n.id, []);
    });

    edges.forEach((e: any) => {
      const sources = adjList.get(e.source) || [];
      sources.push(e.target);
      adjList.set(e.source, sources);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);

      const edgeList = edgeMap.get(e.source) || [];
      edgeList.push({
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        label: e.label || e.data?.label || null,
      });
      edgeMap.set(e.source, edgeList);
    });

    return { adjList, inDegree, edgeMap };
  }, [nodes, edges]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms / speedRef.current[0]));

  const addLog = useCallback((log: Omit<SimulationLog, "id" | "timestamp">) => {
    const newLog: SimulationLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => [...prev, newLog]);
    return newLog;
  }, []);

  // Persist execution to database
  const persistExecution = useCallback(async (
    status: string,
    startTime: number,
    completedNodes: number,
    failedNodes: number,
    totalNodes: number,
    logsData: SimulationLog[],
    reads: number,
    writes: number,
    errorSummary?: string,
  ) => {
    if (!workflowId || !organizationId) return;
    try {
      const duration = Date.now() - startTime;
      await supabase.from("workflow_executions" as any).insert({
        workflow_id: workflowId,
        organization_id: organizationId,
        triggered_by: user?.id,
        trigger_type: "manual",
        status,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        total_nodes: totalNodes,
        nodes_executed: completedNodes,
        nodes_failed: failedNodes,
        execution_logs: logsData.map((l) => ({
          nodeId: l.nodeId,
          nodeLabel: l.nodeLabel,
          status: l.status,
          message: l.message,
          duration: l.duration,
          operation: l.operation,
          table: l.table,
          branch: l.branch,
          data: l.data,
        })),
        db_reads: reads,
        db_writes: writes,
        error_summary: errorSummary || null,
      } as any);

      // Update workflow execution stats
      await supabase.from("workflows").update({
        last_executed_at: new Date().toISOString(),
        execution_count: undefined, // will use raw SQL increment
      } as any).eq("id", workflowId);
    } catch (err) {
      console.error("Failed to persist execution:", err);
    }
  }, [workflowId, organizationId, user]);

  const runSimulation = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setLogs([]);
    setCompletedCount(0);
    setErrorCount(0);
    setTotalDuration(0);
    setDbOpsCount({ reads: 0, writes: 0 });
    setCurrentNodeIdx(0);

    nodes.forEach((n) => onNodeStatusChange(n.id, "idle"));

    const { adjList, inDegree, edgeMap } = buildGraph();

    addLog({
      nodeId: "system",
      nodeLabel: "Simulator",
      nodeIcon: "🚀",
      status: "running",
      message: `Starting LIVE simulation with ${nodes.length} nodes — conditional branching enabled...`,
    });

    await delay(600);

    const startTime = Date.now();
    const executed = new Set<string>();
    const allLogs: SimulationLog[] = [];
    let completed = 0;
    let errors = 0;
    let reads = 0;
    let writes = 0;

    // BFS with conditional branching
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    let stepIdx = 0;

    while (queue.length > 0) {
      if (abortRef.current) break;

      while (isPausedRef.current && !abortRef.current) {
        await delay(100);
      }

      const nodeId = queue.shift()!;
      if (executed.has(nodeId)) continue;
      executed.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeData = node.data as any;
      setCurrentNodeIdx(stepIdx++);

      onNodeStatusChange(nodeId, "running");
      const runningLog = addLog({
        nodeId,
        nodeLabel: nodeData?.label || "Unknown",
        nodeIcon: nodeData?.icon || "⚙️",
        status: "running",
        message: `Executing: ${nodeData?.label}...`,
      });

      // Execute real database operation
      const execStart = Date.now();
      let result: ExecutionResult;
      try {
        result = await executeNode(
          nodeData?.nodeType || "",
          nodeData?.category || "",
          nodeData?.config,
          organizationId
        );
      } catch (err: any) {
        result = { success: false, operation: "SELECT", message: `Unexpected error: ${err.message}`, error: err.message };
      }
      const execDuration = Date.now() - execStart;

      if (abortRef.current) break;

      // Track DB operations
      if (result.operation === "SELECT") {
        reads++;
        setDbOpsCount((prev) => ({ ...prev, reads: prev.reads + 1 }));
      } else if (["INSERT", "UPDATE", "DELETE"].includes(result.operation)) {
        writes++;
        setDbOpsCount((prev) => ({ ...prev, writes: prev.writes + 1 }));
      }

      const isConditionNode = nodeData?.category === "conditions";
      const branchResult = result.data?.branch;

      if (result.success) {
        onNodeStatusChange(nodeId, "success");
        completed++;
        setCompletedCount((c) => c + 1);
        const successLog = {
          nodeId,
          nodeLabel: nodeData?.label || "Unknown",
          nodeIcon: nodeData?.icon || "⚙️",
          status: "success" as const,
          message: result.message,
          duration: execDuration,
          data: result.data,
          operation: result.operation,
          table: result.table,
          branch: isConditionNode ? branchResult : undefined,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
        };
        setLogs((prev) => [...prev, successLog]);
        allLogs.push(successLog);
      } else {
        onNodeStatusChange(nodeId, "error");
        errors++;
        setErrorCount((c) => c + 1);
        const errorLog = {
          nodeId,
          nodeLabel: nodeData?.label || "Unknown",
          nodeIcon: nodeData?.icon || "⚙️",
          status: "error" as const,
          message: result.message,
          duration: execDuration,
          data: result.data,
          operation: result.operation,
          table: result.table,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
        };
        setLogs((prev) => [...prev, errorLog]);
        allLogs.push(errorLog);
      }

      // Determine next nodes based on branching
      const outEdges = edgeMap.get(nodeId) || [];

      if (isConditionNode && branchResult && outEdges.length > 1) {
        // Conditional branching: follow the matching branch
        const trueBranch = outEdges.find(
          (e) =>
            e.sourceHandle === "true" ||
            e.sourceHandle === "yes" ||
            e.label?.toLowerCase() === "true" ||
            e.label?.toLowerCase() === "yes"
        );
        const falseBranch = outEdges.find(
          (e) =>
            e.sourceHandle === "false" ||
            e.sourceHandle === "no" ||
            e.label?.toLowerCase() === "false" ||
            e.label?.toLowerCase() === "no"
        );

        const isTrueBranch = branchResult === "true" || branchResult === "yes";
        const selectedBranch = isTrueBranch ? trueBranch : falseBranch;
        const skippedBranch = isTrueBranch ? falseBranch : trueBranch;

        addLog({
          nodeId,
          nodeLabel: nodeData?.label || "Unknown",
          nodeIcon: "🔀",
          status: "success",
          message: `Branch decision: taking ${isTrueBranch ? "TRUE" : "FALSE"} path`,
          branch: branchResult,
        });

        if (selectedBranch) {
          queue.push(selectedBranch.target);
        }

        // Mark skipped branch nodes
        if (skippedBranch) {
          const skipTarget = nodes.find((n) => n.id === skippedBranch.target);
          if (skipTarget) {
            onNodeStatusChange(skippedBranch.target, "idle");
            addLog({
              nodeId: skippedBranch.target,
              nodeLabel: (skipTarget.data as any)?.label || "Unknown",
              nodeIcon: (skipTarget.data as any)?.icon || "⚙️",
              status: "skipped",
              message: `Skipped: condition evaluated to ${branchResult}`,
            });
          }
        }

        // Also queue any non-branching edges (e.g., edges without handles)
        outEdges.forEach((e) => {
          if (e !== trueBranch && e !== falseBranch && !executed.has(e.target)) {
            queue.push(e.target);
          }
        });
      } else {
        // Non-condition node or single output: follow all edges
        outEdges.forEach((e) => {
          if (!executed.has(e.target)) {
            queue.push(e.target);
          }
        });
      }

      await delay(300);
    }

    const elapsed = Date.now() - startTime;
    setTotalDuration(elapsed);

    const finalStatus = abortRef.current ? "aborted" : errors > 0 ? "completed" : "completed";
    addLog({
      nodeId: "system",
      nodeLabel: "Simulator",
      nodeIcon: "✅",
      status: abortRef.current ? "error" : "success",
      message: abortRef.current
        ? "Simulation aborted by user"
        : `Simulation complete! ${executed.size} nodes processed in ${(elapsed / 1000).toFixed(1)}s`,
    });

    // Persist execution history
    await persistExecution(
      abortRef.current ? "aborted" : errors > 0 ? "completed_with_errors" : "completed",
      startTime, completed, errors, nodes.length, allLogs, reads, writes,
      errors > 0 ? `${errors} node(s) failed during execution` : undefined
    );

    setIsRunning(false);
    setCurrentNodeIdx(-1);
  }, [nodes, edges, organizationId, onNodeStatusChange, buildGraph, addLog, persistExecution]);

  const stopSimulation = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    nodes.forEach((n) => onNodeStatusChange(n.id, "idle"));
  }, [nodes, onNodeStatusChange]);

  const resetSimulation = useCallback(() => {
    stopSimulation();
    setLogs([]);
    setCompletedCount(0);
    setErrorCount(0);
    setTotalDuration(0);
    setDbOpsCount({ reads: 0, writes: 0 });
    setCurrentNodeIdx(-1);
  }, [stopSimulation]);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="w-80 bg-card border-l border-border flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-4 w-4 text-primary" />
              {isRunning && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground">Live Simulator</h3>
            <Badge variant="outline" className="text-[8px] h-4 px-1 border-emerald-500/50 text-emerald-500">
              REAL DB
            </Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-6 text-[10px]">
            Close
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 mb-3">
          {!isRunning ? (
            <Button
              size="sm"
              onClick={runSimulation}
              disabled={nodes.length === 0 || !organizationId}
              className="h-7 gap-1 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="h-3 w-3" />
              Run Live
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPaused(!isPaused)}
                className="h-7 gap-1 text-xs flex-1"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={stopSimulation}
                className="h-7 gap-1 text-xs"
              >
                Stop
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={resetSimulation}
            className="h-7 w-7 p-0"
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <FastForward className="h-3 w-3 text-muted-foreground" />
          <Slider
            value={speed}
            onValueChange={setSpeed}
            min={0.5}
            max={5}
            step={0.5}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{speed[0]}x</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1 p-2 border-b border-border">
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-emerald-500">{completedCount}</div>
          <div className="text-[9px] text-muted-foreground">Passed</div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-destructive">{errorCount}</div>
          <div className="text-[9px] text-muted-foreground">Errors</div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-cyan-500">{dbOpsCount.reads}</div>
          <div className="text-[9px] text-muted-foreground">Reads</div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-amber-500">{dbOpsCount.writes}</div>
          <div className="text-[9px] text-muted-foreground">Writes</div>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Progress</span>
            <span className="text-[10px] font-medium text-foreground">
              {currentNodeIdx + 1} / {nodes.length}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentNodeIdx + 1) / nodes.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Logs */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "p-2 rounded-lg border text-[11px] transition-all",
                  log.status === "running" && "border-primary/30 bg-primary/5",
                  log.status === "success" && "border-emerald-500/20 bg-emerald-500/5",
                  log.status === "error" && "border-destructive/20 bg-destructive/5",
                  log.status === "skipped" && "border-muted bg-muted/30 opacity-60"
                )}
              >
                <div className="flex items-start gap-1.5">
                  <span className="text-sm leading-none mt-0.5">{log.nodeIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground truncate">{log.nodeLabel}</span>
                      {log.status === "running" && <Zap className="h-2.5 w-2.5 text-primary animate-pulse" />}
                      {log.status === "success" && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />}
                      {log.status === "error" && <XCircle className="h-2.5 w-2.5 text-destructive" />}
                      {log.status === "skipped" && <GitBranch className="h-2.5 w-2.5 text-muted-foreground" />}
                    </div>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{log.message}</p>
                    {/* Branch indicator */}
                    {log.branch && (
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-4 px-1 mt-1",
                        log.branch === "true" ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500"
                      )}>
                        <GitBranch className="h-2 w-2 mr-0.5" />
                        {log.branch === "true" ? "TRUE branch" : "FALSE branch"}
                      </Badge>
                    )}
                    {/* Operation & Table badges */}
                    {(log.operation || log.table) && log.status !== "running" && (
                      <div className="mt-1 flex items-center gap-1">
                        {log.operation && (
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-4 px-1 font-mono",
                            log.operation === "SELECT" && "border-cyan-500/40 text-cyan-500",
                            log.operation === "INSERT" && "border-emerald-500/40 text-emerald-500",
                            log.operation === "UPDATE" && "border-amber-500/40 text-amber-500",
                            log.operation === "DELETE" && "border-destructive/40 text-destructive",
                            log.operation === "INVOKE" && "border-purple-500/40 text-purple-500",
                          )}>
                            {log.operation}
                          </Badge>
                        )}
                        {log.table && (
                          <Badge variant="secondary" className="text-[8px] h-4 px-1 font-mono gap-0.5">
                            <Database className="h-2 w-2" />
                            {log.table}
                          </Badge>
                        )}
                      </div>
                    )}
                    {log.data && log.status === "success" && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(log.data).slice(0, 4).map(([key, val]) => (
                          <Badge key={key} variant="secondary" className="text-[8px] h-4 px-1 font-mono">
                            {key}: {typeof val === "object" ? JSON.stringify(val).substring(0, 20) : String(val).substring(0, 15)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {log.duration && (
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
                      <Clock className="h-2 w-2" />
                      {log.duration}ms
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logsEndRef} />
        </div>
      </ScrollArea>

      {/* Footer */}
      {logs.length > 0 && !isRunning && (
        <div className="p-2 border-t border-border">
          <div className={cn(
            "text-center py-2 rounded-lg text-xs font-medium",
            errorCount > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600"
          )}>
            {errorCount > 0
              ? `⚠️ Completed with ${errorCount} error(s)`
              : "✅ All nodes executed successfully!"}
          </div>
          <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5" /> {dbOpsCount.reads} reads</span>
            <span className="flex items-center gap-1"><ArrowUpDown className="h-2.5 w-2.5" /> {dbOpsCount.writes} writes</span>
            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {(totalDuration / 1000).toFixed(1)}s</span>
          </div>
          {workflowId && (
            <p className="text-center text-[9px] text-muted-foreground mt-1">
              📝 Execution saved to history
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
