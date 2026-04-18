/**
 * FieldProperties — right-hand panel showing the editable properties of the
 * currently selected field. Mutations are bubbled up via `onChange`.
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isInputField, type BaseField, type FieldOption, type LogicOperator } from "@/lib/forms/schema";

interface Props {
  field: BaseField | null;
  /** Sibling fields (or peer top-level fields) used to choose the visibility driver. */
  siblings: BaseField[];
  onChange: (patch: Partial<BaseField>) => void;
}

const OPERATORS: { value: LogicOperator; label: string }[] = [
  { value: "equals", label: "= equals" },
  { value: "not_equals", label: "≠ does not equal" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "is not one of" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "is_empty", label: "is empty" },
  { value: "is_filled", label: "is filled" },
];

export function FieldProperties({ field, siblings, onChange }: Props) {
  if (!field) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Select a field on the canvas to edit its properties.
      </div>
    );
  }

  const isInput = isInputField(field.type);
  const hasOptions =
    field.type === "select" || field.type === "radio" || field.type === "multiselect";

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {field.type} field
          </h3>
        </div>

        <Field label="Label">
          <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        </Field>

        <Field label="Key (snake_case)">
          <Input
            value={field.key}
            onChange={(e) => onChange({ key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })}
            className="font-mono"
          />
        </Field>

        {field.type === "info_banner" ? (
          <Field label="Content (markdown / HTML)">
            <Textarea
              rows={4}
              value={field.content ?? ""}
              onChange={(e) => onChange({ content: e.target.value })}
            />
          </Field>
        ) : null}

        {isInput ? (
          <>
            <Field label="Help text">
              <Input value={field.helpText ?? ""} onChange={(e) => onChange({ helpText: e.target.value })} />
            </Field>
            <Field label="Placeholder">
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value })}
              />
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Required</Label>
              <Switch checked={!!field.required} onCheckedChange={(v) => onChange({ required: v })} />
            </div>
          </>
        ) : null}

        {field.type === "repeater" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min rows">
                <Input
                  type="number"
                  value={field.minRows ?? 1}
                  onChange={(e) => onChange({ minRows: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label="Max rows">
                <Input
                  type="number"
                  value={field.maxRows ?? 30}
                  onChange={(e) => onChange({ maxRows: Number(e.target.value) || 30 })}
                />
              </Field>
            </div>
          </>
        ) : null}

        {hasOptions ? <OptionsEditor field={field} onChange={onChange} /> : null}

        {field.type === "computed" ? (
          <>
            <Separator />
            <Field label="Expression">
              <Textarea
                value={field.computedFrom?.expression ?? ""}
                onChange={(e) =>
                  onChange({
                    computedFrom: {
                      ...(field.computedFrom ?? {}),
                      expression: e.target.value,
                    } as any,
                  })
                }
                rows={2}
                className="font-mono text-xs"
                placeholder="{{quantity}} * {{unit_price}}"
              />
            </Field>
            <Field label="Result type">
              <Select
                value={field.computedFrom?.resultType ?? "number"}
                onValueChange={(v) =>
                  onChange({
                    computedFrom: {
                      expression: field.computedFrom?.expression ?? "",
                      resultType: v as any,
                    },
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="text-[11px] text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{`{{field_key}}`}</code>, math operators,
              and <code className="bg-muted px-1 rounded">SUM(repeater.field)</code> /{" "}
              <code className="bg-muted px-1 rounded">COUNT(repeater)</code> aggregates.
            </p>
          </>
        ) : null}

        {isInput || field.type === "section" || field.type === "repeater" ? (
          <>
            <Separator />
            <Field label="Layout width">
              <Select
                value={String(field.layout?.colSpan ?? 2)}
                onValueChange={(v) => onChange({ layout: { colSpan: Number(v) as 1 | 2 } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Half width</SelectItem>
                  <SelectItem value="2">Full width</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}

        <Separator />
        <VisibilityEditor field={field} siblings={siblings} onChange={onChange} />
      </div>
    </ScrollArea>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ---------- Options editor ----------------------------------------------

function OptionsEditor({
  field, onChange,
}: { field: BaseField; onChange: (p: Partial<BaseField>) => void }) {
  const opts: FieldOption[] = field.options ?? [];
  const update = (i: number, patch: Partial<FieldOption>) => {
    const next = opts.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onChange({ options: next });
  };
  const add = () =>
    onChange({
      options: [...opts, { label: `Option ${opts.length + 1}`, value: `option_${opts.length + 1}` }],
    });
  const remove = (i: number) => onChange({ options: opts.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-2">
      <Label className="text-xs">Options</Label>
      <div className="space-y-1.5">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={o.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label"
              className="h-7 text-xs"
            />
            <Input
              value={o.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="value"
              className="h-7 text-xs font-mono"
            />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Add option
      </Button>
    </div>
  );
}

// ---------- Visibility editor ------------------------------------------

function VisibilityEditor({
  field, siblings, onChange,
}: {
  field: BaseField;
  siblings: BaseField[];
  onChange: (p: Partial<BaseField>) => void;
}) {
  const enabled = !!field.visibleWhen;
  const rule = field.visibleWhen ?? { field: "", operator: "equals" as LogicOperator, value: "" };
  const candidates = siblings.filter((s) => s.id !== field.id && isInputField(s.type));
  const noValueOps: LogicOperator[] = ["is_empty", "is_filled"];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Conditional visibility</Label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange({ visibleWhen: v ? rule : undefined })}
        />
      </div>
      {enabled ? (
        <div className="space-y-1.5 rounded-md border border-border p-2 bg-muted/20">
          <div className="text-[11px] text-muted-foreground">Show this field when…</div>
          <Select
            value={rule.field}
            onValueChange={(v) => onChange({ visibleWhen: { ...rule, field: v } })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
            <SelectContent>
              {candidates.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-muted-foreground">No sibling fields</div>
              ) : candidates.map((c) => (
                <SelectItem key={c.id} value={c.key}>{c.label} ({c.key})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rule.operator}
            onValueChange={(v) => onChange({ visibleWhen: { ...rule, operator: v as LogicOperator } })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!noValueOps.includes(rule.operator) ? (
            <Input
              className="h-8 text-xs"
              value={String(rule.value ?? "")}
              onChange={(e) => onChange({ visibleWhen: { ...rule, value: e.target.value } })}
              placeholder={rule.operator === "in" || rule.operator === "not_in" ? "comma,separated" : "value"}
            />
          ) : null}
          {(rule.operator === "in" || rule.operator === "not_in") ? (
            <p className="text-[10px] text-muted-foreground">Comma-separated values</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
