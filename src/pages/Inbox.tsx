import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Inbox as InboxIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInMinutes } from "date-fns";
import { TaskFilters, type StatusFilter, type Scope } from "@/components/inbox/TaskFilters";
import { TaskList } from "@/components/inbox/TaskList";
import { TaskContextPanel } from "@/components/inbox/TaskContextPanel";
import { BulkActionBar } from "@/components/inbox/BulkActionBar";
import { EmptyState } from "@/components/inbox/EmptyState";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";
import type { WorkflowTask } from "@/components/inbox/types";
import { useSopInboxTasks, isSopTask } from "@/hooks/useSopInboxTasks";
import { WORKFLOW_CONFIGS } from "@/lib/workflow-engine/configs";

const DEFAULT_SLA_MINUTES = 60 * 24; // 1 day

export default function Inbox() {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Filters
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [slaFilter, setSlaFilter] = useState<"all" | "breach" | "warn">("all");

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Current user (for "Me" scope)
  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 5 * 60_000,
  });

  // Tasks fetch — visual workflow builder
  const { data: builderTasks = [], isLoading: builderLoading } = useQuery<WorkflowTask[]>({
    queryKey: ["workflow-tasks", organizationId, status],
    enabled: !!organizationId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_tasks" as any)
        .select("*, workflows(name, nodes)")
        .eq("organization_id", organizationId!)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      return ((data ?? []) as any[]).map((task) => {
        const matchedNode = Array.isArray(task.workflows?.nodes)
          ? task.workflows.nodes.find((node: any) => node?.id === task.node_id)
          : null;
        const cfg = matchedNode?.data?.config ?? {};
        const cfgFields = Array.isArray(cfg.fields) ? cfg.fields : [];
        const cfgActions = Array.isArray(cfg.actions) ? cfg.actions : [];
        const formKey = matchedNode
          ? (cfg.form_key ?? null)
          : (cfg.form_key ?? task.form_key ?? null);
        return {
          ...task,
          form_schema: cfgFields.length ? cfgFields : (task.form_schema ?? []),
          form_key: formKey,
          context: {
            ...(cfg.prefill ?? {}),
            ...(cfg.context ?? {}),
            ...(task.context ?? {}),
          },
          actions: cfgActions.length ? cfgActions : (task.actions ?? []),
        } as WorkflowTask;
      });
    },
  });

  // SOP-engine instances surfaced as inbox tasks
  const { data: sopTasks = [], isLoading: sopLoading } = useSopInboxTasks(organizationId, status);

  const rawTasks = useMemo<WorkflowTask[]>(
    () => [...sopTasks, ...builderTasks],
    [sopTasks, builderTasks],
  );
  const isLoading = builderLoading || sopLoading;

  // Apply filters in-memory
  const filteredTasks = useMemo(() => {
    let list = rawTasks;
    if (scope === "me" && currentUserId) {
      list = list.filter(t => (t as any).assignee_user_id === currentUserId);
    }
    if (workflowFilter) list = list.filter(t => t.workflows?.name === workflowFilter);
    if (roleFilter) list = list.filter(t => t.assignee_role === roleFilter);
    if (slaFilter !== "all") {
      list = list.filter(t => {
        const created = new Date(t.created_at);
        const due = t.due_at ? new Date(t.due_at) : new Date(created.getTime() + DEFAULT_SLA_MINUTES * 60_000);
        const total = Math.max(1, differenceInMinutes(due, created));
        const elapsed = Math.max(0, differenceInMinutes(new Date(), created));
        const ratio = elapsed / total;
        if (slaFilter === "breach") return ratio >= 1;
        if (slaFilter === "warn") return ratio >= 0.7 && ratio < 1;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.workflows?.name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rawTasks, scope, currentUserId, workflowFilter, roleFilter, slaFilter, search]);

  const counts = useMemo(() => {
    const breach = rawTasks.filter(t => {
      const created = new Date(t.created_at);
      const due = t.due_at ? new Date(t.due_at) : new Date(created.getTime() + DEFAULT_SLA_MINUTES * 60_000);
      return new Date() >= due;
    }).length;
    return {
      pending: status === "pending" ? rawTasks.length : 0,
      completed: status === "completed" ? rawTasks.length : 0,
      breach,
    };
  }, [rawTasks, status]);

  // Reset selection on org/status change
  useEffect(() => {
    setSelectedId(null);
    setSelection(new Set());
  }, [organizationId, status]);

  const selected = filteredTasks.find(t => t.id === selectedId) ?? null;

  const toggleSelection = (id: string) => {
    setSelection(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (ids: string[]) => {
    setSelection(prev => {
      const allIn = ids.every(i => prev.has(i));
      const next = new Set(prev);
      ids.forEach(i => allIn ? next.delete(i) : next.add(i));
      return next;
    });
  };

  const submit = async (decision: string, payload: Record<string, any>) => {
    if (!selected) return;
    // For SOP tasks, validate only against the picked action's own fields.
    // For visual-builder tasks, fall back to the flattened form_schema.
    if (!selected.form_key) {
      const sopAction = isSopTask(selected)
        ? (selected.__stageActions ?? []).find((a) => a.id === decision)
        : null;
      const fieldsToCheck = sopAction?.fields ?? selected.form_schema ?? [];
      for (const f of fieldsToCheck) {
        const val = payload[(f as any).key];
        if ((f as any).required && (val === undefined || val === null || val === "")) {
          toast({ title: `${(f as any).label} is required`, variant: "destructive" });
          return;
        }
      }
    }
    setSubmitting(true);

    // ── SOP-engine task path ──────────────────────────────────────────
    if (isSopTask(selected)) {
      const instance = selected.__instance;
      const config = WORKFLOW_CONFIGS[instance.workflow_type];
      const action = (selected.__stageActions ?? []).find((a) => a.id === decision);
      if (!config || !action) {
        setSubmitting(false);
        toast({ title: "Action not available for this stage", variant: "destructive" });
        return;
      }
      const toStage = config.stages.find((s) => s.id === action.toStage);
      const newStatus = action.completes || toStage?.terminal ? "completed" : "in_progress";
      const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

      const mergedData = { ...(instance.data || {}), ...(payload || {}) };
      const { data: userData } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from("workflow_instances")
        .update({
          current_stage: action.toStage,
          current_lane: toStage?.lane || instance.current_lane,
          status: newStatus,
          completed_at: completedAt,
          data: mergedData,
        })
        .eq("id", instance.id);
      if (updErr) {
        setSubmitting(false);
        toast({ title: "Failed to submit", description: updErr.message, variant: "destructive" });
        return;
      }
      await supabase.from("workflow_transitions").insert({
        organization_id: instance.organization_id,
        instance_id: instance.id,
        workflow_type: config.type,
        from_stage: instance.current_stage,
        to_stage: action.toStage,
        from_lane: instance.current_lane,
        to_lane: toStage?.lane || instance.current_lane,
        decision: action.id,
        notes: payload.notes || null,
        performed_by: userData.user?.id || null,
        payload: payload || {},
      });
      setSubmitting(false);
      toast({ title: "Stage advanced", description: `${config.title} → ${toStage?.label ?? action.toStage}` });
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["sop-inbox-tasks"] });
      qc.invalidateQueries({ queryKey: ["workflow-instances", config.type] });

      // Vehicle Handover finalize hook: when archived, re-assign vehicle + notify all parties
      if (
        config.type === "vehicle_handover" &&
        (action.toStage === "archived" || toStage?.terminal)
      ) {
        try {
          await supabase.functions.invoke("vehicle-handover-finalize", {
            body: { workflow_instance_id: instance.id },
          });
        } catch (e) {
          console.warn("vehicle-handover-finalize failed", e);
        }
      }
      return;
    }

    // ── Visual builder task path ─────────────────────────────────────
    const { error } = await supabase.rpc("complete_workflow_task" as any, {
      _task_id: selected.id,
      _decision: decision,
      _result: payload,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Step completed", description: "Workflow will resume shortly." });
    const { workflow_id, run_id } = selected;
    setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["workflow-tasks"] });
    supabase.functions.invoke("workflow-runner", {
      body: { workflow_id, run_id },
    }).catch(() => { /* cron retries */ });
  };

  // Bulk actions
  const bulkCancel = async () => {
    if (selection.size === 0) return;
    if (!confirm(`Cancel ${selection.size} task${selection.size > 1 ? "s" : ""}?`)) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("workflow_tasks" as any)
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", Array.from(selection));
    setSubmitting(false);
    if (error) {
      toast({ title: "Bulk cancel failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${selection.size} task(s) cancelled` });
    setSelection(new Set());
    qc.invalidateQueries({ queryKey: ["workflow-tasks"] });
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <InboxIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight">Task Inbox</h1>
              <p className="text-xs text-muted-foreground truncate">
                Pending human steps from active workflows
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {counts.breach > 0 && status === "pending" && (
              <Badge variant="outline" className="border-[hsl(var(--sla-breach)/0.4)] text-[hsl(var(--sla-breach))] bg-[hsl(var(--sla-breach)/0.1)]">
                {counts.breach} overdue
              </Badge>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: filters */}
          <TaskFilters
            status={status} setStatus={setStatus}
            scope={scope} setScope={setScope}
            search={search} setSearch={setSearch}
            workflowFilter={workflowFilter} setWorkflowFilter={setWorkflowFilter}
            roleFilter={roleFilter} setRoleFilter={setRoleFilter}
            slaFilter={slaFilter} setSlaFilter={setSlaFilter}
            tasks={rawTasks}
            counts={counts}
          />

          {/* Middle: list */}
          <main className="flex-1 flex flex-col overflow-hidden border-r border-border">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState status={status} />
            ) : (
              <TaskList
                tasks={filteredTasks}
                selectedId={selectedId}
                onSelect={(t) => setSelectedId(t.id)}
                selection={selection}
                toggleSelection={toggleSelection}
                toggleSelectAll={toggleSelectAll}
              />
            )}

            <BulkActionBar
              count={selection.size}
              busy={submitting}
              onClear={() => setSelection(new Set())}
              onCancel={bulkCancel}
              onReassign={() => toast({ title: "Reassign", description: "Reassign UI coming in Phase 1.1." })}
              onAddNote={() => toast({ title: "Notes", description: "Bulk notes coming in Phase 1.1." })}
            />
          </main>

          {/* Right: context panel (form_key path opens its own dialog instead) */}
          <TaskContextPanel
            task={selected && !selected.form_key ? selected : null}
            organizationId={organizationId}
            onClose={() => setSelectedId(null)}
            onSubmit={submit}
            submitting={submitting}
          />
        </div>
      </div>

      {/* External form path: opens its own dialog */}
      {selected?.form_key && status === "pending" ? (
        <RenderWorkflowForm
          formKey={selected.form_key}
          prefill={{
            ...(selected.context ?? {}),
            vehicle_id: selected.vehicle_id ?? selected.context?.vehicle_id,
            driver_id: selected.driver_id ?? selected.context?.driver_id,
          }}
          onCancel={() => setSelectedId(null)}
          onSubmitted={(result) => {
            const decision = getWorkflowForm(selected.form_key!)?.default_decision ?? "submitted";
            submit(decision, { ...(result ?? {}), form_key: selected.form_key });
          }}
        />
      ) : null}
    </Layout>
  );
}
