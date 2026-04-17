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
  Sparkles,
  Filter,
  X,
  ArrowDownAZ,
  ArrowUpDown,
  Shield,
  Wrench,
  Fuel,
  ClipboardCheck,
  Settings2,
  Bell,
  Snowflake,
  Radio,
  BatteryCharging,
  LayoutGrid,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { seedSOPWorkflows } from "@/lib/workflow-engine/seedSOPs";
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
  const { user, hasRole } = useAuth() as any;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "runs" | "created">("updated");
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);
  const [webhookWorkflow, setWebhookWorkflow] = useState<any | null>(null);

  // Show seed button to anyone who can manage workflows in this org.
  // RLS still enforces what they can actually insert.
  const canSeedSOPs =
    typeof hasRole === "function"
      ? hasRole("super_admin") || hasRole("fleet_owner") || hasRole("operations_manager") || hasRole("fleet_manager")
      : true;

  const seedSOPsMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Pick an organization first (sidebar org switcher)");
      const report = await seedSOPWorkflows(organizationId, user?.id);
      if (report.errors.length && report.inserted === 0 && report.updated === 0) {
        throw new Error(report.errors[0]);
      }
      return report;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", organizationId] });
      const errs = report.errors.length ? ` · ${report.errors.length} errors (see console)` : "";
      if (report.errors.length) console.warn("[seedSOPs] errors:", report.errors);
      toast({
        title: "SOP workflows seeded",
        description: `${report.inserted} new · ${report.updated} updated · ${report.total} total${errs}`,
        variant: report.errors.length ? "destructive" : "default",
      });
    },
    onError: (e: any) => {
      console.error("[seedSOPs] failed:", e);
      toast({ title: "Seed failed", description: e?.message || "Unknown error", variant: "destructive" });
    },
  });

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

  // Build category list from real workflow data
  const categoryCounts = (workflows || []).reduce((acc: Record<string, number>, w: any) => {
    const c = (w.category || "uncategorized").toLowerCase();
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const availableCategories = Object.keys(categoryCounts).sort();

  // Domain → categories taxonomy (professional 2-tier grouping)
  const domainCounts: Record<string, number> = {};
  for (const cat of availableCategories) {
    const domain = getDomainForCategory(cat);
    domainCounts[domain] = (domainCounts[domain] || 0) + categoryCounts[cat];
  }
  const availableDomains = Object.keys(domainCounts).sort(
    (a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b),
  );
  const subCategoriesForDomain =
    domainFilter === "all"
      ? []
      : availableCategories.filter((c) => getDomainForCategory(c) === domainFilter);

  const filteredWorkflows = (workflows || [])
    .filter((w: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        w.name?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.category?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        (w.category || "uncategorized").toLowerCase() === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "runs":
          return (b.execution_count || 0) - (a.execution_count || 0);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "updated":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

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
        <div className="flex items-center gap-2">
          {canSeedSOPs && (
            <Button
              variant="outline"
              onClick={() => seedSOPsMutation.mutate()}
              disabled={seedSOPsMutation.isPending}
              className="gap-2"
              title="Convert the 14 hardcoded SOP configs into editable visual workflows"
            >
              <Sparkles className="h-4 w-4" />
              {seedSOPsMutation.isPending ? "Seeding..." : "Seed SOP Workflows"}
            </Button>
          )}
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Stats — clickable to filter by status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: workflows?.length || 0, icon: GitBranch, status: "all" },
          { label: "Active", value: workflows?.filter((w: any) => w.status === "active").length || 0, icon: Play, status: "active" },
          { label: "Draft", value: workflows?.filter((w: any) => w.status === "draft").length || 0, icon: Edit, status: "draft" },
          { label: "Paused", value: workflows?.filter((w: any) => w.status === "paused").length || 0, icon: Pause, status: "paused" },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "p-3 cursor-pointer transition-all hover:border-primary/50",
              statusFilter === stat.status && "border-primary bg-primary/5",
            )}
            onClick={() => setStatusFilter(stat.status)}
          >
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Status + Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-9 w-[170px]">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="created">Recently created</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="runs">Most runs</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1.5 text-xs text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear ({activeFilterCount})
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {filteredWorkflows.length} of {workflows?.length || 0}
            </div>
          </div>

          {/* Row 2: Category chips */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
              <CategoryChip
                label="All"
                icon={<LayoutGrid className="h-3 w-3" />}
                count={workflows?.length || 0}
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
              />
              {availableCategories.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={cat.replace(/_/g, " ")}
                  icon={getCategoryIcon(cat)}
                  count={categoryCounts[cat]}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

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
              className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
              onClick={() => onEdit(workflow.id)}
            >
              <CardContent className="p-4 flex flex-col flex-1">
                {/* Header: icon + wrapping title + overflow menu */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground leading-snug break-words line-clamp-2">
                      {workflow.name}
                    </h3>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0 opacity-60 group-hover:opacity-100"
                        >
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
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem]">
                  {workflow.description || "No description"}
                </p>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <Badge className={cn(statusColors[workflow.status] || statusColors.draft, "text-[10px] capitalize")} variant="secondary">
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

                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(workflow.updated_at), "MMM d, HH:mm")}
                  </div>
                  <div>
                    {(workflow.nodes as any[])?.length || 0} nodes · {(workflow.edges as any[])?.length || 0} edges
                  </div>
                </div>

                {(workflow as any).last_executed_at && (
                  <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5" />
                    Last run: {format(new Date((workflow as any).last_executed_at), "MMM d, HH:mm")}
                  </div>
                )}

                {/* Action footer */}
                <div
                  className="flex items-center gap-2 mt-3 pt-3 border-t border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 flex-1 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); runNowMutation.mutate(workflow.id); }}
                    disabled={runNowMutation.isPending}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Run
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); onEdit(workflow.id); }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 shrink-0"
                    title={workflow.status === "active" ? "Pause" : "Activate"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatusMutation.mutate({ id: workflow.id, currentStatus: workflow.status });
                    }}
                  >
                    {workflow.status === "active" ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
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
                runHistory.map((exec: any) => {
                  const log: any[] = Array.isArray(exec.execution_log) ? exec.execution_log : [];
                  const passed = log.filter((l) => l.status === "success").length;
                  const failedCt = log.filter((l) => l.status === "error").length;
                  const trig = exec.trigger_data?.source || "manual";
                  return (
                    <div key={exec.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {exec.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {exec.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                          {exec.status === "running" && <Activity className="h-4 w-4 text-amber-500 animate-pulse" />}
                          <span className="text-sm font-medium capitalize">{exec.status}</span>
                          <Badge variant="outline" className="text-[10px]">{trig}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(exec.started_at), "MMM d, HH:mm:ss")}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-bold text-foreground">{log.length}</div>
                          <div className="text-[9px] text-muted-foreground">Nodes Run</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-500">{passed}</div>
                          <div className="text-[9px] text-muted-foreground">Passed</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-destructive">{failedCt}</div>
                          <div className="text-[9px] text-muted-foreground">Failed</div>
                        </div>
                      </div>
                      {exec.duration_ms != null && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Duration: {(exec.duration_ms / 1000).toFixed(2)}s
                        </div>
                      )}
                      {exec.error_message && (
                        <div className="text-[10px] text-destructive bg-destructive/10 p-1.5 rounded">
                          {exec.error_message}
                        </div>
                      )}
                      {log.length > 0 && (
                        <details className="text-[10px]">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Per-node log ({log.length})
                          </summary>
                          <div className="mt-1 space-y-1 max-h-48 overflow-auto">
                            {log.map((l, i) => (
                              <div key={i} className="flex items-start gap-1.5 p-1 rounded bg-background/50">
                                {l.status === "success"
                                  ? <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5" />
                                  : <XCircle className="h-3 w-3 text-destructive mt-0.5" />}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{l.label}</div>
                                  <div className="text-muted-foreground truncate">{l.message}</div>
                                </div>
                                <span className="text-muted-foreground shrink-0">{l.duration_ms}ms</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No runs yet</p>
                  <p className="text-xs">Click <strong>Run Now</strong> on any workflow, or wait for the cron / event triggers to fire.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Webhook URL dialog */}
      <Dialog open={!!webhookWorkflow} onOpenChange={(open) => !open && setWebhookWorkflow(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" /> Webhook Endpoint
            </DialogTitle>
            <DialogDescription>
              POST to this URL to fire the workflow from any external system.
            </DialogDescription>
          </DialogHeader>
          {webhookWorkflow && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">URL (keep token secret)</div>
              <code className="block p-3 rounded bg-muted text-xs break-all">
                {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/workflow-webhook?token=${webhookWorkflow.webhook_token}`}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/workflow-webhook?token=${webhookWorkflow.webhook_token}`
                  );
                  toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy URL
              </Button>
              <div className="text-[11px] text-muted-foreground">
                The endpoint accepts an optional JSON body which will be passed to the workflow as <code>trigger_data.payload</code>.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ----- Category filtering helpers -----

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  safety: <Shield className="h-3 w-3" />,
  maintenance: <Wrench className="h-3 w-3" />,
  fuel: <Fuel className="h-3 w-3" />,
  compliance: <ClipboardCheck className="h-3 w-3" />,
  operations: <Settings2 className="h-3 w-3" />,
  alerts: <Bell className="h-3 w-3" />,
  cold_chain: <Snowflake className="h-3 w-3" />,
  sensors: <Radio className="h-3 w-3" />,
  ev_charging: <BatteryCharging className="h-3 w-3" />,
};

function getCategoryIcon(category: string): React.ReactNode {
  return CATEGORY_ICON_MAP[category] || <GitBranch className="h-3 w-3" />;
}

interface CategoryChipProps {
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
}

function CategoryChip({ label, icon, count, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors capitalize border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/40 text-foreground/80 border-border hover:bg-muted hover:border-primary/40",
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
