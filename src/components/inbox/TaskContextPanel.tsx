import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict, format } from "date-fns";
import {
  X, Loader2, Car, User as UserIcon, History, Activity, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { RenderWorkflowForm, getWorkflowForm } from "@/lib/workflow-forms/registry";
import { SlaChip } from "./SlaChip";
import { RoleChip } from "./RoleChip";
import { StagePill } from "./StagePill";
import type { WorkflowTask } from "./types";

interface TaskContextPanelProps {
  task: WorkflowTask | null;
  organizationId: string | null;
  onClose: () => void;
  onSubmit: (decision: string, payload: Record<string, any>) => Promise<void>;
  submitting: boolean;
}

export function TaskContextPanel({ task, organizationId, onClose, onSubmit, submitting }: TaskContextPanelProps) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!task) return;
    const init: Record<string, any> = {};
    (task.form_schema ?? []).forEach((f) => (init[f.key] = ""));
    setValues(init);
  }, [task?.id]);

  // Recent activity for this run
  const { data: history } = useQuery({
    queryKey: ["workflow-task-history", task?.run_id],
    enabled: !!task?.run_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_tasks" as any)
        .select("id, node_id, title, status, decision, completed_at, completed_by, created_at, assignee_role")
        .eq("run_id", task!.run_id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as any[];
    },
  });

  // Linked vehicle
  const { data: vehicle } = useQuery({
    queryKey: ["inbox-vehicle", task?.vehicle_id],
    enabled: !!task?.vehicle_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, status")
        .eq("id", task!.vehicle_id!)
        .maybeSingle();
      return data;
    },
  });

  // Linked driver
  const { data: driver } = useQuery({
    queryKey: ["inbox-driver", task?.driver_id],
    enabled: !!task?.driver_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, phone, status")
        .eq("id", task!.driver_id!)
        .maybeSingle();
      return data;
    },
  });

  if (!task) {
    return (
      <aside className="hidden xl:flex w-[420px] shrink-0 border-l border-border bg-card/30 backdrop-blur-sm flex-col items-center justify-center p-8 text-center">
        <div className="text-sm text-muted-foreground">
          Select a task to see details, history, and take action.
        </div>
      </aside>
    );
  }

  const isFormKey = !!task.form_key;
  const totalNodes = Array.isArray(task.workflows?.nodes) ? task.workflows!.nodes!.length : undefined;

  const handleAction = async (decision: string) => {
    if (!isFormKey) {
      for (const f of task.form_schema ?? []) {
        if (f.required && !values[f.key]) {
          // simple required validation handled in parent toast — short-circuit via submit
          // but we still call submit so parent can warn (avoid duplicate UX)
        }
      }
    }
    await onSubmit(decision, values);
  };

  return (
    <aside
      className={cn(
        "fixed xl:static inset-y-0 right-0 z-40 w-full sm:w-[460px] xl:w-[460px] shrink-0",
        "border-l border-border bg-card shadow-[var(--shadow-floating)] xl:shadow-none",
        "flex flex-col h-full animate-in slide-in-from-right-4 duration-200",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StagePill stageId={task.node_id} total={totalNodes} />
            <RoleChip role={task.assignee_role} />
            {task.status === "pending" ? (
              <SlaChip createdAt={task.created_at} dueAt={task.due_at} />
            ) : null}
          </div>
          <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
          <div className="text-xs text-muted-foreground">
            {task.workflows?.name ?? "Workflow"} · created {formatDistanceToNowStrict(new Date(task.created_at))} ago
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 -mr-1 -mt-1" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Description */}
          {task.description && (
            <p className="text-sm text-foreground/85 leading-relaxed">{task.description}</p>
          )}

          {/* Linked entities */}
          {(vehicle || driver) && (
            <div className="grid gap-2">
              {vehicle && (
                <a
                  href={`/vehicles?id=${vehicle.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{vehicle.plate_number}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </a>
              )}
              {driver && (
                <a
                  href={`/drivers?id=${driver.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {[driver.first_name, driver.last_name].filter(Boolean).join(" ") || "Driver"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{driver.phone ?? "—"}</div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </a>
              )}
            </div>
          )}

          {/* Why am I seeing this — recent transitions */}
          {history && history.length > 1 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
                <History className="h-3.5 w-3.5" />
                Recent activity
                <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <ol className="relative border-l border-border ml-1.5 space-y-3 pl-4 py-1">
                  {history.slice(0, 5).map((h) => (
                    <li key={h.id} className="relative">
                      <span className={cn(
                        "absolute -left-[21px] top-1 h-2 w-2 rounded-full ring-2 ring-card",
                        h.id === task.id
                          ? "bg-[hsl(var(--status-running))] animate-pulse"
                          : h.status === "completed"
                          ? "bg-[hsl(var(--status-done))]"
                          : "bg-[hsl(var(--status-pending))]",
                      )} />
                      <div className="text-xs">
                        <div className="font-medium text-foreground/90 flex items-center gap-1.5">
                          <StagePill stageId={h.node_id} />
                          <span className="truncate">{h.title}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {h.status === "completed" && h.completed_at
                            ? `${h.decision ?? "completed"} · ${format(new Date(h.completed_at), "MMM d, HH:mm")}`
                            : h.id === task.id
                            ? "← you are here"
                            : `pending · ${formatDistanceToNowStrict(new Date(h.created_at))} ago`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Form */}
          {task.status === "pending" && !isFormKey && (task.form_schema ?? []).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5" />
                Required input
              </div>
              {(task.form_schema ?? []).map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">
                    {f.label}{f.required ? <span className="text-destructive ml-0.5">*</span> : null}
                  </Label>
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
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={
                        f.type === "number" ? "number" :
                        f.type === "date" ? "date" :
                        f.type === "datetime" ? "datetime-local" : "text"
                      }
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* External-form path note */}
          {task.status === "pending" && isFormKey && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-foreground/85">
              <Activity className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
              This step uses the
              <span className="font-mono mx-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary">{task.form_key}</span>
              form. Click an action below to open it.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Action footer */}
      {task.status === "pending" && (
        <div className="border-t border-border bg-card/80 backdrop-blur p-3">
          {(task.form_schema?.length ?? 0) === 0 && !isFormKey && (
            <p className="text-[11px] text-muted-foreground italic mb-2 text-center">
              No input required — pick an action to advance.
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            {(task.actions?.length ? task.actions : [{ id: "approve", label: "Approve" }]).map((a) => {
              const inferDestructive = a.id.includes("reject") || a.id.includes("fail") || a.id.includes("deny");
              const variant = a.variant ?? (inferDestructive ? "destructive" : "default");
              return (
                <Button
                  key={a.id}
                  size="sm"
                  variant={variant as any}
                  onClick={() => handleAction(a.id)}
                  disabled={submitting}
                  className={variant === "default" ? "min-w-[88px]" : undefined}
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  {a.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {task.status === "completed" && (
        <div className="border-t border-border bg-muted/30 p-3 text-xs text-muted-foreground text-center">
          Completed {/* placeholder; could expand */} — read-only
        </div>
      )}
    </aside>
  );
}
