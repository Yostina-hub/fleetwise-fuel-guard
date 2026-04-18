import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Users,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { listWorkflowForms, USER_FORM_PREFIX } from "@/lib/workflow-forms/registry";
import { useFormsList } from "@/lib/forms/api";
import { useOrganization } from "@/hooks/useOrganization";
import {
  APP_ROLES,
  ROLES_BY_GROUP,
  AUTHORITY_SCOPES,
  roleLabel,
  type AppRole,
} from "@/lib/workflow-engine/appRoles";
import { useResolvedApprover } from "@/lib/workflow-engine/useResolvedApprover";
import { cn } from "@/lib/utils";

type FieldType = "text" | "textarea" | "number" | "date" | "datetime" | "select";

interface FormField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface TaskAction {
  id: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

interface Props {
  config: any;
  isApproval?: boolean;
  onChange: (cfg: any) => void;
}

export const HumanTaskEditor = ({ config, isApproval, onChange }: Props) => {
  const { organizationId } = useOrganization();
  const userFormsQ = useFormsList(organizationId, false);
  const userForms = (userFormsQ.data ?? []).filter((f) => !!f.current_published_version_id);

  const fields: FormField[] = Array.isArray(config?.fields) ? config.fields : [];
  const actions: TaskAction[] = Array.isArray(config?.actions)
    ? config.actions
    : isApproval
    ? [{ id: "approve", label: "Approve" }, { id: "reject", label: "Reject", variant: "destructive" }]
    : [{ id: "done", label: "Mark Done" }];

  // Backwards-compat: lift legacy single `assignee_role` into the new
  // `allowed_roles` array on first render-time access. We only WRITE the
  // new shape; the old key is preserved for any consumers still reading it.
  const allowedRoles: AppRole[] = Array.isArray(config?.allowed_roles)
    ? config.allowed_roles
    : config?.assignee_role
    ? [config.assignee_role as AppRole]
    : [];

  // Delegation matrix wiring (approval nodes only)
  const useDelegation: boolean = !!config?.use_delegation_matrix;
  const matrixScope: string | null = config?.matrix_scope ?? null;
  const stepOrder: number = Number(config?.matrix_step_order ?? 1);
  const amount: number | undefined =
    typeof config?.matrix_amount === "number" ? config.matrix_amount : undefined;

  const resolved = useResolvedApprover(
    matrixScope,
    stepOrder,
    amount,
    isApproval && useDelegation && !!matrixScope,
  );

  const setCfg = (patch: any) => onChange({ ...config, ...patch });
  const setFields = (next: FormField[]) => setCfg({ fields: next });
  const setActions = (next: TaskAction[]) => setCfg({ actions: next });

  const toggleRole = (role: AppRole) => {
    const next = allowedRoles.includes(role)
      ? allowedRoles.filter((r) => r !== role)
      : [...allowedRoles, role];
    // Keep `assignee_role` mirrored to the first selected role for any legacy reader.
    setCfg({ allowed_roles: next, assignee_role: next[0] ?? null });
  };

  const addField = () =>
    setFields([
      ...fields,
      { key: `field_${fields.length + 1}`, label: "New field", type: "text", required: false },
    ]);
  const updateField = (idx: number, patch: Partial<FormField>) =>
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const removeField = (idx: number) => setFields(fields.filter((_, i) => i !== idx));
  const moveField = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    setFields(next);
  };

  const addAction = () =>
    setActions([
      ...actions,
      { id: `action_${actions.length + 1}`, label: "New action", variant: "default" },
    ]);
  const updateAction = (idx: number, patch: Partial<TaskAction>) =>
    setActions(actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const removeAction = (idx: number) => setActions(actions.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      {/* Task header */}
      <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="text-xs font-semibold text-foreground">
          {isApproval ? "Approval Task" : "Human Task"}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Inbox Title</Label>
          <Input
            value={config?.title || ""}
            onChange={(e) => setCfg({ title: e.target.value })}
            placeholder={isApproval ? "e.g. Approve fuel request above 5,000 ETB" : "e.g. Inspect vehicle and record findings"}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Inbox Description</Label>
          <Textarea
            value={config?.description || ""}
            onChange={(e) => setCfg({ description: e.target.value })}
            placeholder="Instructions for the assignee..."
            className="text-xs min-h-[60px]"
          />
        </div>

        {/* Lane / swimlane (visual grouping) */}
        <div className="space-y-1.5">
          <Label className="text-xs">Swimlane (visual group)</Label>
          <Input
            value={config?.lane || ""}
            onChange={(e) => setCfg({ lane: e.target.value })}
            placeholder="e.g. Operations, Driver, Approver"
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Used to group nodes visually by responsible team.
          </p>
        </div>
      </div>

      {/* Allowed roles (multi-select, grouped) */}
      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          <div className="text-xs font-semibold text-foreground">Allowed Roles</div>
          {allowedRoles.length > 0 && (
            <Badge variant="secondary" className="ml-auto h-5 text-[10px] px-1.5">
              {allowedRoles.length} selected
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {isApproval
            ? "Anyone holding ANY of these roles can approve. Use the Authority Matrix below to derive these dynamically per request."
            : "Anyone holding ANY of these roles can claim and complete this task."}
        </p>

        {Object.entries(ROLES_BY_GROUP).map(([group, roles]) => (
          <div key={group} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground pt-1">
              {group}
            </div>
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => {
                const active = allowedRoles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    title={r.description}
                    className={cn(
                      "h-6 px-2 rounded-md border text-[11px] transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-accent",
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {allowedRoles.length === 0 && (
          <p className="text-[10px] text-destructive italic pt-1">
            ⚠ No roles selected — task will be unclaimable. Pick at least one role
            (or enable Authority Matrix below).
          </p>
        )}
      </div>

      {/* Authority Matrix binding (approvals only) */}
      {isApproval && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <div className="text-xs font-semibold text-foreground">Delegation / Authority Matrix</div>
            <Switch
              className="ml-auto"
              checked={useDelegation}
              onCheckedChange={(v) => setCfg({ use_delegation_matrix: v })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            When enabled, the runtime resolves the approver from your org's{" "}
            <span className="font-mono">authority_matrix</span> using the chosen scope,
            request amount, and ladder step. Falls back to the Allowed Roles list above.
          </p>

          {useDelegation && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Authority Scope</Label>
                <Select
                  value={matrixScope ?? ""}
                  onValueChange={(v) => setCfg({ matrix_scope: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select scope..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTHORITY_SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Step (ladder)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={stepOrder}
                    onChange={(e) =>
                      setCfg({ matrix_step_order: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (optional)</Label>
                  <Input
                    type="number"
                    value={config?.matrix_amount ?? ""}
                    onChange={(e) =>
                      setCfg({
                        matrix_amount: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="e.g. 5000"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Live resolution preview */}
              <div className="rounded-md border border-border bg-card p-2 text-[11px]">
                {resolved.isLoading && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Resolving approver…
                  </div>
                )}
                {resolved.data && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Resolved approver:</span>
                      <div className="flex flex-wrap gap-1">
                        {resolved.data.roles.map((r) => (
                          <Badge key={r} variant="default" className="h-4 text-[10px] px-1.5">
                            {roleLabel(r)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Source:{" "}
                      <span className="font-mono">{resolved.data.source}</span>
                      {resolved.data.ruleLabel && (
                        <>
                          {" · Rule: "}
                          <span className="font-mono">{resolved.data.ruleLabel}</span>
                        </>
                      )}
                      {" · Step "}
                      {resolved.data.stepOrder ?? stepOrder}
                    </div>
                  </div>
                )}
                {!resolved.isLoading && !resolved.data && matrixScope && (
                  <div className="text-muted-foreground">
                    No matching rule. Will fall back to Allowed Roles.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reusable form picker */}
      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <div className="text-xs font-semibold text-foreground">Reusable Form</div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Embed an existing app form (Work Request, Work Order, Inspection, Fuel Request).
          When set, the Inbox renders the full form instead of the ad-hoc fields below.
        </p>
        <Select
          value={config?.form_key || "__none__"}
          onValueChange={(v) => setCfg({ form_key: v === "__none__" ? null : v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="None — use ad-hoc fields" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None — use ad-hoc fields below</SelectItem>
            {listWorkflowForms().length > 0 && (
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Built-in
              </div>
            )}
            {listWorkflowForms().map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
            {userForms.length > 0 && (
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border mt-1">
                User-built (Forms module)
              </div>
            )}
            {userForms.map((f) => (
              <SelectItem key={f.id} value={`${USER_FORM_PREFIX}${f.key}`}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {config?.form_key && (
          <p className="text-[10px] text-muted-foreground italic">
            On submit, the task is auto-completed with decision{" "}
            <span className="font-mono">submitted</span>. Connect an outgoing edge labeled{" "}
            <span className="font-mono">submitted</span> to route the next step.
          </p>
        )}
      </div>

      {/* Form fields builder */}
      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground">Form Fields</div>
          <Button size="sm" variant="outline" onClick={addField} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Field
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">
            No fields yet. The task will only show action buttons.
          </p>
        ) : (
          fields.map((f, idx) => (
            <div key={idx} className="p-2 rounded-md border border-border bg-card space-y-2">
              <div className="flex items-center gap-1">
                <Input
                  value={f.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                  placeholder="Field label"
                  className="h-7 text-xs flex-1"
                />
                <Button size="sm" variant="ghost" onClick={() => moveField(idx, -1)} className="h-7 w-7 p-0">
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => moveField(idx, 1)} className="h-7 w-7 p-0">
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeField(idx)}
                  className="h-7 w-7 p-0 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={f.key}
                  onChange={(e) => updateField(idx, { key: e.target.value.replace(/\s+/g, "_") })}
                  placeholder="key"
                  className="h-7 text-xs font-mono"
                />
                <Select
                  value={f.type || "text"}
                  onValueChange={(v) => updateField(idx, { type: v as FieldType })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="datetime">Date &amp; Time</SelectItem>
                    <SelectItem value="select">Select (dropdown)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                value={f.placeholder || ""}
                onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                placeholder="Placeholder (optional)"
                className="h-7 text-xs"
              />

              {f.type === "select" && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Options (one per line, value|label)
                  </Label>
                  <Textarea
                    value={(f.options || []).map((o) => `${o.value}|${o.label}`).join("\n")}
                    onChange={(e) => {
                      const opts = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [value, ...rest] = line.split("|");
                          return { value: value.trim(), label: (rest.join("|") || value).trim() };
                        });
                      updateField(idx, { options: opts });
                    }}
                    placeholder={"pass|Pass\nfail|Fail"}
                    className="text-[11px] font-mono min-h-[60px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Required</Label>
                <Switch
                  checked={!!f.required}
                  onCheckedChange={(v) => updateField(idx, { required: v })}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions builder */}
      <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground">Action Buttons</div>
          <Button size="sm" variant="outline" onClick={addAction} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Action
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Each action's <span className="font-mono">id</span> is the branch label. Connect outgoing edges
          from this node and label them with the same id to route per decision.
        </p>

        {actions.map((a, idx) => (
          <div key={idx} className="p-2 rounded-md border border-border bg-card space-y-1.5">
            <div className="flex items-center gap-1">
              <Input
                value={a.label}
                onChange={(e) => updateAction(idx, { label: e.target.value })}
                placeholder="Button label"
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeAction(idx)}
                className="h-7 w-7 p-0 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={a.id}
                onChange={(e) => updateAction(idx, { id: e.target.value.replace(/\s+/g, "_") })}
                placeholder="action_id"
                className="h-7 text-xs font-mono"
              />
              <Select
                value={a.variant || "default"}
                onValueChange={(v) => updateAction(idx, { variant: v as TaskAction["variant"] })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
