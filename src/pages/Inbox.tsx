import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Inbox as InboxIcon, CheckCircle2, Clock, Loader2, FileText } from "lucide-react";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface FormField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface TaskAction {
  id: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

interface WorkflowTask {
  id: string;
  workflow_id: string;
  run_id: string;
  node_id: string;
  title: string;
  description: string | null;
  assignee_role: string | null;
  form_schema: FormField[];
  /** When set, the Inbox renders the registered reusable form instead of ad-hoc fields. */
  form_key?: string | null;
  /** Prefilled values from the workflow run context (vehicle_id, driver_id, etc.). */
  context?: Record<string, any> | null;
  actions: TaskAction[];
  status: string;
  vehicle_id: string | null;
  driver_id: string | null;
  due_at: string | null;
  created_at: string;
  workflows?: { name: string } | null;
}

export default function Inbox() {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<WorkflowTask | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"pending" | "completed">("pending");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["workflow-tasks", organizationId, filter],
    enabled: !!organizationId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_tasks" as any)
        .select("*, workflows(name)")
        .eq("organization_id", organizationId!)
        .eq("status", filter)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as WorkflowTask[];
    },
  });

  useEffect(() => {
    if (selected) {
      const init: Record<string, any> = {};
      (selected.form_schema ?? []).forEach((f) => (init[f.key] = ""));
      setValues(init);
    }
  }, [selected]);

  const submit = async (decision: string, resultPayload?: Record<string, any>) => {
    if (!selected) return;
    // basic required-field validation (only for ad-hoc fields)
    if (!selected.form_key) {
      for (const f of selected.form_schema ?? []) {
        if (f.required && !values[f.key]) {
          toast({ title: `${f.label} is required`, variant: "destructive" });
          return;
        }
      }
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("complete_workflow_task" as any, {
      _task_id: selected.id,
      _decision: decision,
      _result: resultPayload ?? values,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Step completed", description: "Workflow will resume shortly." });
    const wfId = selected.workflow_id;
    const runId = selected.run_id;
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["workflow-tasks"] });
    // Kick the runner immediately for snappy UX (cron also picks it up within 1 min)
    supabase.functions.invoke("workflow-runner", {
      body: { workflow_id: wfId, run_id: runId },
    }).catch(() => {/* server runner cron will retry */});
  };

  const grouped = useMemo(() => {
    const m = new Map<string, WorkflowTask[]>();
    for (const t of tasks) {
      const k = t.workflows?.name ?? "Workflow";
      m.set(k, [...(m.get(k) ?? []), t]);
    }
    return Array.from(m.entries());
  }, [tasks]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <InboxIcon className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Task Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Pending human steps from active workflows. Complete one to advance the workflow.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
            >
              <Clock className="w-4 h-4 mr-1" /> Pending
            </Button>
            <Button
              size="sm"
              variant={filter === "completed" ? "default" : "outline"}
              onClick={() => setFilter("completed")}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Completed
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No {filter} tasks. When a workflow reaches a Human Task or Approval step, it will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([wfName, items]) => (
              <Card key={wfName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {wfName} <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => filter === "pending" && setSelected(t)}
                      className="w-full text-left p-3 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.title}</div>
                        {t.description ? (
                          <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.assignee_role ? (
                          <Badge variant="outline" className="text-xs">{t.assignee_role}</Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.description ?? `Complete this step to advance the ${selected.workflows?.name ?? "workflow"}.`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {(selected.form_schema ?? []).map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}{f.required ? " *" : ""}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={3}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={values[f.key] ?? ""}
                        onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setSelected(null)} disabled={submitting}>
                  Cancel
                </Button>
                {(selected.actions?.length
                  ? selected.actions
                  : [{ id: "approve", label: "Approve" }]
                ).map((a) => (
                  <Button
                    key={a.id}
                    variant={a.variant ?? (a.id.includes("reject") || a.id.includes("fail") ? "destructive" : "default")}
                    onClick={() => submit(a.id)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    {a.label}
                  </Button>
                ))}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
