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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
}

interface WorkflowSimulatorProps {
  nodes: any[];
  edges: any[];
  onNodeStatusChange: (nodeId: string, status: string) => void;
  onClose: () => void;
}

// Realistic simulation data generators
const SIMULATION_DATA: Record<string, () => Record<string, any>> = {
  triggers: () => ({
    vehicle: { id: "VH-" + Math.floor(Math.random() * 999), name: "Truck #" + Math.floor(Math.random() * 50 + 1), plate: "AB-" + Math.floor(Math.random() * 9999) },
    driver: { id: "DR-" + Math.floor(Math.random() * 999), name: ["John Doe", "Sarah Smith", "Mike Chen", "Emma Wilson", "James Brown"][Math.floor(Math.random() * 5)] },
    event: { speed_kmh: Math.floor(Math.random() * 60 + 80), fuel_level: Math.floor(Math.random() * 100), lat: 9.01 + Math.random() * 0.1, lng: 38.74 + Math.random() * 0.1 },
    timestamp: new Date().toISOString(),
  }),
  conditions: () => ({
    result: Math.random() > 0.4,
    evaluated: true,
    branch: Math.random() > 0.4 ? "true" : "false",
  }),
  fleet: () => ({
    action_id: "ACT-" + Math.floor(Math.random() * 99999),
    completed: true,
    affected_vehicles: Math.floor(Math.random() * 5 + 1),
  }),
  notifications: () => ({
    sent: true,
    recipients: Math.floor(Math.random() * 5 + 1),
    delivery_status: "delivered",
    message_id: "MSG-" + Math.floor(Math.random() * 99999),
  }),
  data: () => ({
    records_processed: Math.floor(Math.random() * 100 + 10),
    query_time_ms: Math.floor(Math.random() * 200 + 20),
    result_count: Math.floor(Math.random() * 50 + 1),
  }),
  timing: () => ({
    waited_ms: Math.floor(Math.random() * 5000 + 1000),
    resumed: true,
  }),
  sensors: () => ({
    reading: (Math.random() * 100).toFixed(2),
    unit: ["°C", "%", "kg", "g", "V"][Math.floor(Math.random() * 5)],
    sensor_status: "online",
  }),
  safety_hardware: () => ({
    device_status: "active",
    event_captured: true,
    confidence: (Math.random() * 30 + 70).toFixed(1) + "%",
  }),
};

export const WorkflowSimulator = ({
  nodes,
  edges,
  onNodeStatusChange,
  onClose,
}: WorkflowSimulatorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [currentNodeIdx, setCurrentNodeIdx] = useState(-1);
  const [speed, setSpeed] = useState([1]);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const abortRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getExecutionOrder = useCallback(() => {
    // Topological sort based on edges
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach((n) => {
      adjList.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    edges.forEach((e: any) => {
      const sources = adjList.get(e.source) || [];
      sources.push(e.target);
      adjList.set(e.source, sources);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      (adjList.get(current) || []).forEach((neighbor) => {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) queue.push(neighbor);
      });
    }

    return order;
  }, [nodes, edges]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms / speed[0]));

  const addLog = useCallback((log: Omit<SimulationLog, "id" | "timestamp">) => {
    const newLog: SimulationLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => [...prev, newLog]);
    return newLog;
  }, []);

  const getNodeMessages = (nodeData: any): string => {
    const category = nodeData?.category;
    const label = nodeData?.label || "Node";
    const messages: Record<string, string[]> = {
      triggers: [`Trigger fired: ${label}`, `Event received for ${label}`, `${label} activated`],
      conditions: [`Evaluating: ${label}`, `Checking condition: ${label}`],
      fleet: [`Executing fleet action: ${label}`, `Processing: ${label}`],
      notifications: [`Sending notification: ${label}`, `Delivering: ${label}`],
      data: [`Querying data: ${label}`, `Processing: ${label}`],
      timing: [`Timer started: ${label}`, `Waiting: ${label}`],
    };
    const pool = messages[category] || [`Processing: ${label}`];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const runSimulation = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setLogs([]);
    setCompletedCount(0);
    setErrorCount(0);
    setTotalDuration(0);
    setCurrentNodeIdx(0);

    // Reset all nodes
    nodes.forEach((n) => onNodeStatusChange(n.id, "idle"));

    const executionOrder = getExecutionOrder();

    addLog({
      nodeId: "system",
      nodeLabel: "Simulator",
      nodeIcon: "🚀",
      status: "running",
      message: `Starting simulation with ${executionOrder.length} nodes...`,
    });

    await delay(800);

    const startTime = Date.now();

    for (let i = 0; i < executionOrder.length; i++) {
      if (abortRef.current) break;

      // Wait while paused
      while (isPaused && !abortRef.current) {
        await delay(100);
      }

      const nodeId = executionOrder[i];
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeData = node.data as any;
      setCurrentNodeIdx(i);

      // Set node to running
      onNodeStatusChange(nodeId, "running");
      addLog({
        nodeId,
        nodeLabel: nodeData?.label || "Unknown",
        nodeIcon: nodeData?.icon || "⚙️",
        status: "running",
        message: getNodeMessages(nodeData),
      });

      // Simulate processing time (300ms - 1500ms)
      const processingTime = Math.floor(Math.random() * 1200 + 300);
      await delay(processingTime);

      if (abortRef.current) break;

      // Determine result (90% success for simulation)
      const isError = Math.random() < 0.08;
      const category = nodeData?.category || "actions";
      const simData = SIMULATION_DATA[category]?.() || {};

      if (isError) {
        onNodeStatusChange(nodeId, "error");
        setErrorCount((c) => c + 1);
        addLog({
          nodeId,
          nodeLabel: nodeData?.label || "Unknown",
          nodeIcon: nodeData?.icon || "⚙️",
          status: "error",
          message: `Error in ${nodeData?.label}: Connection timeout after ${processingTime}ms`,
          duration: processingTime,
          data: { error: "TIMEOUT", retry_count: 0 },
        });
      } else {
        // For condition nodes, show which branch was taken
        if (category === "conditions") {
          const branch = simData.branch || "true";
          onNodeStatusChange(nodeId, "success");
          addLog({
            nodeId,
            nodeLabel: nodeData?.label || "Unknown",
            nodeIcon: nodeData?.icon || "⚙️",
            status: "success",
            message: `Condition evaluated → ${branch === "true" ? "✓ TRUE branch" : "✗ FALSE branch"} (${processingTime}ms)`,
            duration: processingTime,
            data: simData,
          });
        } else {
          onNodeStatusChange(nodeId, "success");
          setCompletedCount((c) => c + 1);
          addLog({
            nodeId,
            nodeLabel: nodeData?.label || "Unknown",
            nodeIcon: nodeData?.icon || "⚙️",
            status: "success",
            message: `${nodeData?.label} completed in ${processingTime}ms`,
            duration: processingTime,
            data: simData,
          });
        }
      }

      await delay(200);
    }

    const elapsed = Date.now() - startTime;
    setTotalDuration(elapsed);

    addLog({
      nodeId: "system",
      nodeLabel: "Simulator",
      nodeIcon: "✅",
      status: abortRef.current ? "error" : "success",
      message: abortRef.current
        ? "Simulation aborted by user"
        : `Simulation complete! ${executionOrder.length} nodes processed in ${(elapsed / 1000).toFixed(1)}s`,
    });

    setIsRunning(false);
    setCurrentNodeIdx(-1);
  }, [nodes, edges, onNodeStatusChange, getExecutionOrder, addLog, delay, speed, isPaused]);

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
            <h3 className="text-sm font-bold text-foreground">Simulator</h3>
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
              disabled={nodes.length === 0}
              className="h-7 gap-1 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="h-3 w-3" />
              Run Simulation
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
      <div className="grid grid-cols-3 gap-1 p-2 border-b border-border">
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-emerald-500">{completedCount}</div>
          <div className="text-[9px] text-muted-foreground">Passed</div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-destructive">{errorCount}</div>
          <div className="text-[9px] text-muted-foreground">Errors</div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-muted/50">
          <div className="text-lg font-bold text-primary">{(totalDuration / 1000).toFixed(1)}s</div>
          <div className="text-[9px] text-muted-foreground">Duration</div>
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
                    </div>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{log.message}</p>
                    {log.data && log.status === "success" && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(log.data).slice(0, 3).map(([key, val]) => (
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
              ? `⚠️ Simulation completed with ${errorCount} error(s)`
              : "✅ All nodes executed successfully!"}
          </div>
        </div>
      )}
    </motion.div>
  );
};
