import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  Zap,
  GitBranch,
  MoreVertical,
  Copy,
  History,
  CheckCircle2,
  XCircle,
  Activity,
  Rocket,
  Webhook,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface WorkflowListProps {
  onCreateNew: () => void;
  onEdit: (workflowId: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  archived: "bg-red-500/10 text-red-600",
};

export const WorkflowList = ({ onCreateNew, onEdit }: WorkflowListProps) => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);
  const [webhookWorkflow, setWebhookWorkflow] = useState<any | null>(null);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Server-side run history (workflow_runs) — populated by edge runner
  const { data: runHistory } = useQuery({
    queryKey: ["workflow-runs", historyWorkflowId],
    queryFn: async () => {
      if (!historyWorkflowId) return [];
      const { data, error } = await (supabase as any)
        .from("workflow_runs")
        .select("*")
        .eq("workflow_id", historyWorkflowId)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!historyWorkflowId,
    refetchInterval: 4000,
  });

  // Manually fire a workflow via the edge runner
  const runNowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase.functions.invoke("workflow-runner", {
        body: { workflow_id: workflowId, trigger_data: { source: "manual_ui" } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      toast({ title: "Workflow started", description: "Execution running on the server" });
    },
    onError: (e: any) =>
      toast({ title: "Run failed", description: e?.message || "Unknown error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      toast({ title: "Deleted", description: "Workflow removed" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (workflow: any) => {
      const { error } = await supabase.from("workflows").insert({
        organization_id: organizationId,
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        category: workflow.category,
        nodes: workflow.nodes,
        edges: workflow.edges,
        status: "draft",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      toast({ title: "Duplicated", description: "Workflow copied as draft" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      const { error } = await supabase.from("workflows").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      toast({ title: "Status Updated", description: `Workflow is now ${newStatus}` });
    },
  });

  const filteredWorkflows = workflows?.filter(
    (w: any) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workflow Automations</h2>
          <p className="text-sm text-muted-foreground">
            Build powerful automations with drag-and-drop visual builder
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: workflows?.length || 0, icon: GitBranch },
          { label: "Active", value: workflows?.filter((w: any) => w.status === "active").length || 0, icon: Play },
          { label: "Draft", value: workflows?.filter((w: any) => w.status === "draft").length || 0, icon: Edit },
          { label: "Paused", value: workflows?.filter((w: any) => w.status === "paused").length || 0, icon: Pause },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Workflow Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow: any) => (
            <Card
              key={workflow.id}
              className="group cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => onEdit(workflow.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground truncate">{workflow.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(workflow.id); }}>
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); runNowMutation.mutate(workflow.id); }}
                        disabled={runNowMutation.isPending}
                      >
                        <Rocket className="h-3.5 w-3.5 mr-2" /> Run Now
                      </DropdownMenuItem>
                      {workflow.webhook_token && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setWebhookWorkflow(workflow); }}>
                          <Webhook className="h-3.5 w-3.5 mr-2" /> Webhook URL
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(workflow); }}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        toggleStatusMutation.mutate({ id: workflow.id, currentStatus: workflow.status });
                      }}>
                        {workflow.status === "active" ? (
                          <><Pause className="h-3.5 w-3.5 mr-2" /> Pause</>
                        ) : (
                          <><Play className="h-3.5 w-3.5 mr-2" /> Activate</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHistoryWorkflowId(workflow.id); }}>
                        <History className="h-3.5 w-3.5 mr-2" /> Run History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(workflow.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {workflow.description || "No description"}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={statusColors[workflow.status] || statusColors.draft} variant="secondary">
                    {workflow.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    v{workflow.version}
                  </Badge>
                  {(workflow as any).execution_count > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Activity className="h-2.5 w-2.5" />
                      {(workflow as any).execution_count} runs
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(workflow.updated_at), "MMM d, HH:mm")}
                  </div>
                  <div>
                    {(workflow.nodes as any[])?.length || 0} nodes · {(workflow.edges as any[])?.length || 0} connections
                  </div>
                </div>

                {(workflow as any).last_executed_at && (
                  <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5" />
                    Last run: {format(new Date((workflow as any).last_executed_at), "MMM d, HH:mm")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No Workflows Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first automation workflow to streamline fleet operations
          </p>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Workflow
          </Button>
        </Card>
      )}

      {/* Run History Dialog (live workflow_runs from server-side runner) */}
      <Dialog open={!!historyWorkflowId} onOpenChange={(open) => !open && setHistoryWorkflowId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Run History
            </DialogTitle>
            <DialogDescription>
              Live runs executed by the server-side workflow engine. Refreshes every 4s.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-4">
              {runHistory && runHistory.length > 0 ? (
                runHistory.map((exec: any) => (
                  <div
                    key={exec.id}
                    className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {exec.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {exec.status === "completed_with_errors" && <XCircle className="h-4 w-4 text-amber-500" />}
                        {exec.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                        {exec.status === "aborted" && <Pause className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium capitalize">{exec.status.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="text-[10px]">{exec.trigger_type}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(exec.started_at), "MMM d, HH:mm:ss")}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-foreground">{exec.total_nodes}</div>
                        <div className="text-[9px] text-muted-foreground">Total</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-500">{exec.nodes_executed}</div>
                        <div className="text-[9px] text-muted-foreground">Passed</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-destructive">{exec.nodes_failed}</div>
                        <div className="text-[9px] text-muted-foreground">Failed</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-cyan-500">{exec.db_reads}</div>
                        <div className="text-[9px] text-muted-foreground">Reads</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-amber-500">{exec.db_writes}</div>
                        <div className="text-[9px] text-muted-foreground">Writes</div>
                      </div>
                    </div>
                    {exec.duration_ms && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        Duration: {(exec.duration_ms / 1000).toFixed(1)}s
                      </div>
                    )}
                    {exec.error_summary && (
                      <div className="text-[10px] text-destructive bg-destructive/10 p-1.5 rounded">
                        {exec.error_summary}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No executions yet</p>
                  <p className="text-xs">Run a simulation to see execution history</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
