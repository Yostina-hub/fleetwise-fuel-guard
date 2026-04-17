import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

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

const ROLES = [
  "fleet_manager",
  "operations_manager",
  "dispatcher",
  "mechanic",
  "driver",
  "finance",
  "hr",
  "admin",
  "super_admin",
];

export const HumanTaskEditor = ({ config, isApproval, onChange }: Props) => {
  const fields: FormField[] = Array.isArray(config?.fields) ? config.fields : [];
  const actions: TaskAction[] = Array.isArray(config?.actions)
    ? config.actions
    : isApproval
    ? [{ id: "approve", label: "Approve" }, { id: "reject", label: "Reject", variant: "destructive" }]
    : [{ id: "done", label: "Mark Done" }];

  const setCfg = (patch: any) => onChange({ ...config, ...patch });
  const setFields = (next: FormField[]) => setCfg({ fields: next });
  const setActions = (next: TaskAction[]) => setCfg({ actions: next });

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
            placeholder="e.g. Inspect vehicle and record findings"
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

        <div className="space-y-1.5">
          <Label className="text-xs">Assignee Role</Label>
          <Select
            value={config?.assignee_role || ""}
            onValueChange={(v) => setCfg({ assignee_role: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
