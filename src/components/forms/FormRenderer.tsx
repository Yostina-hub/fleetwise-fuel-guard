/**
 * FormRenderer — single source of truth for rendering a FormSchema.
 *
 * Handles all field types, conditional visibility (visibleWhen), computed
 * fields, repeating sections, and zod validation on submit. Integrates with
 * useFormDraft for autosave/restore when a draftKey is provided.
 *
 * Usage:
 *   <FormRenderer
 *     schema={schema}
 *     settings={settings}
 *     prefill={prefill}
 *     draftKey="form:123"          // optional autosave
 *     onSubmit={async (values) => { ... }}
 *     onCancel={() => ...}
 *   />
 */
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftStatus } from "@/components/inbox/DraftStatus";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import {
  useVehiclesLite, useDriversLite, useAssetsLite,
  useGeofencesLite, useUsersLite,
} from "@/lib/forms/useEntityOptions";
import { evalExpression } from "@/lib/forms/expression";
import { isVisible } from "@/lib/forms/visibility";
import { buildZodForFields } from "@/lib/forms/validation";
import {
  type BaseField, type FormSchema, type FormSettings,
  EMPTY_SETTINGS, isInputField, walkFields,
} from "@/lib/forms/schema";

/** Default sibling keys for `location` field type. */
const locKeys = (f: BaseField) => ({
  latKey: f.latKey || `${f.key}_lat`,
  lngKey: f.lngKey || `${f.key}_lng`,
});

interface FormRendererProps {
  schema: FormSchema;
  settings?: FormSettings;
  prefill?: Record<string, any>;
  draftKey?: string | null;
  submitting?: boolean;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  /**
   * Stable form key (`forms.key`). When this matches a registered legacy form,
   * the renderer short-circuits to the legacy component for full feature parity.
   */
  formKey?: string | null;
}

function defaultRow(rowFields: BaseField[]): Record<string, any> {
  const row: Record<string, any> = {};
  for (const f of rowFields) {
    if (!isInputField(f.type)) continue;
    row[f.key] = f.defaultValue ?? (f.type === "multiselect" ? [] : "");
  }
  return row;
}

function defaultValuesFromSchema(
  schema: FormSchema,
  prefill?: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = { ...(prefill ?? {}) };
  for (const { field } of walkFields(schema.fields)) {
    if (out[field.key] !== undefined) continue;
    if (field.type === "repeater") {
      const rows: Record<string, any>[] = [];
      const min = Math.max(1, field.minRows ?? 1);
      for (let i = 0; i < min; i++) rows.push(defaultRow(field.fields ?? []));
      out[field.key] = rows;
    } else if (isInputField(field.type)) {
      out[field.key] =
        field.defaultValue ?? (field.type === "multiselect" ? [] : field.type === "checkbox" || field.type === "switch" ? false : "");
    }
  }
  return out;
}

export function FormRenderer({
  schema, settings, prefill, draftKey, submitting, onSubmit, onCancel,
}: FormRendererProps) {
  const cfg = { ...EMPTY_SETTINGS, ...(settings ?? {}) };
  const { organizationId } = useOrganization();

  const initialValues = useMemo(
    () => defaultValuesFromSchema(schema, prefill),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(schema), JSON.stringify(prefill ?? {})],
  );

  const draft = useFormDraft<Record<string, any>>(draftKey ?? null, initialValues);
  const values = draft.values;
  const setField = draft.setField;
  const setValues = draft.setValues;

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect which entity types are needed for picker queries.
  const needs = useMemo(() => {
    const set = new Set<string>();
    for (const { field } of walkFields(schema.fields)) set.add(field.type);
    return set;
  }, [schema]);

  const vehicles = useVehiclesLite(organizationId, needs.has("vehicle"));
  const drivers = useDriversLite(organizationId, needs.has("driver"));
  const assets = useAssetsLite(organizationId, needs.has("asset"));
  const geofences = useGeofencesLite(organizationId, needs.has("geofence"));
  const users = useUsersLite(organizationId, needs.has("user"));

  // Fleet pools — needed when any `pool` field is in the schema. Loaded once
  // per render and filtered per-field by the sibling `filterByKey` value.
  const pools = useQuery({
    queryKey: ["form-fleet-pools", organizationId],
    enabled: !!organizationId && needs.has("pool"),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_pools")
        .select("name, category")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return (data ?? []) as Array<{ name: string; category: string }>;
    },
    staleTime: 60_000,
  });

  // Hardcoded fallback when fleet_pools has no matching rows (mirrors legacy POOL_HIERARCHY).
  const POOL_FALLBACK: Record<string, string[]> = {
    corporate: ["FAN", "TPO", "HQ"],
    zone: ["SWAAZ", "EAAZ"],
    region: ["NR", "SR"],
  };

  // Apply computed fields whenever values change.
  useEffect(() => {
    const updates: Record<string, any> = {};
    for (const { field } of walkFields(schema.fields)) {
      if (!field.computedFrom?.expression) continue;
      const result = evalExpression(field.computedFrom.expression, values);
      if (result === null) continue;
      const formatted =
        field.computedFrom.resultType === "currency"
          ? Number(result).toFixed(2)
          : String(result);
      if (String(values[field.key] ?? "") !== formatted) {
        updates[field.key] = formatted;
      }
    }
    if (Object.keys(updates).length) {
      setValues((prev) => ({ ...prev, ...updates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), JSON.stringify(schema)]);

  // Build a flat list of currently-visible top-level fields for validation.
  const visibleTopLevel = useMemo(
    () => schema.fields.filter((f) => isVisible(f.visibleWhen, values)),
    [schema, values],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const zodSchema = buildZodForFields(visibleTopLevel);
    const result = zodSchema.safeParse(values);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = issue.path.join(".");
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    try {
      await onSubmit(result.data);
      draft.clear();
    } catch (err: any) {
      toast.error(err?.message || "Submit failed");
    }
  };

  // ---------- Field renderers --------------------------------------------

  const renderInput = (field: BaseField, value: any, onValue: (v: any) => void, errKey: string) => {
    const err = errors[errKey];
    const common = { id: field.key, "aria-invalid": !!err };

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            {...common}
            value={value ?? ""}
            onChange={(e) => onValue(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case "select":
        return (
          <Select value={value ?? ""} onValueChange={onValue}>
            <SelectTrigger {...common}><SelectValue placeholder={field.placeholder ?? "Select…"} /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiselect": {
        const arr: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
            {(field.options ?? []).map((o) => {
              const checked = arr.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onValue(checked ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                  className={cn(
                    "px-2 py-1 rounded text-xs border transition-colors",
                    checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }
      case "radio":
        return (
          <RadioGroup value={value ?? ""} onValueChange={onValue}>
            {(field.options ?? []).map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} id={`${field.key}-${o.value}`} />
                <Label htmlFor={`${field.key}-${o.value}`} className="text-sm font-normal">{o.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={(v) => onValue(!!v)} id={field.key} />
            <Label htmlFor={field.key} className="text-sm font-normal">{field.placeholder || "Yes"}</Label>
          </div>
        );
      case "switch":
        return <Switch checked={!!value} onCheckedChange={onValue} />;
      case "vehicle":
      case "driver":
      case "asset":
      case "geofence":
      case "user": {
        const opts = (() => {
          if (field.type === "vehicle") return (vehicles.data ?? []).map((v: any) => ({
            value: v.id, label: `${v.plate_number} — ${[v.make, v.model].filter(Boolean).join(" ")}`,
          }));
          if (field.type === "driver") return (drivers.data ?? []).map((d: any) => ({
            value: d.id, label: `${[d.first_name, d.last_name].filter(Boolean).join(" ")} (${d.license_number ?? "—"})`,
          }));
          if (field.type === "asset") return (assets.data ?? []).map((a: any) => ({
            value: a.id, label: `${a.name} (${a.asset_type ?? "asset"})`,
          }));
          if (field.type === "geofence") return (geofences.data ?? []).map((g: any) => ({
            value: g.id, label: g.name,
          }));
          return (users.data ?? []).map((u: any) => ({
            value: u.id, label: u.full_name || u.email,
          }));
        })();
        return (
          <Select value={value ?? ""} onValueChange={onValue}>
            <SelectTrigger {...common}><SelectValue placeholder={`Select ${field.type}…`} /></SelectTrigger>
            <SelectContent>
              {opts.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No options</div>
              ) : opts.map((o: any) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "computed":
        return (
          <Input
            {...common}
            value={value ?? ""}
            readOnly
            className="bg-muted/40"
            placeholder="(computed)"
          />
        );
      case "file":
        // Phase 2: simple text input for file URLs/paths. Real upload UI in Phase 3.
        return (
          <Input
            {...common}
            type="url"
            value={value ?? ""}
            onChange={(e) => onValue(e.target.value)}
            placeholder="https://..."
          />
        );
      case "location": {
        // Reuses the legacy LocationPickerField — text + map + geofence picker.
        const { latKey, lngKey } = locKeys(field);
        return (
          <LocationPickerField
            label=""
            value={value ?? ""}
            onChange={onValue}
            onCoordsChange={(lat, lng) => {
              setField(latKey, lat);
              setField(lngKey, lng);
            }}
            placeholder={field.placeholder || "Select or type a place"}
          />
        );
      }
      case "pool": {
        // Dynamic options driven by sibling `filterByKey` (default "pool_category").
        const filterKey = field.filterByKey || "pool_category";
        const filterValue = String(values[filterKey] ?? "");
        const dbPools = (pools.data ?? [])
          .filter((p) => p.category === filterValue)
          .map((p) => p.name);
        const fallback = POOL_FALLBACK[filterValue] ?? [];
        const opts = dbPools.length > 0 ? dbPools : fallback;
        return (
          <Select value={value ?? ""} onValueChange={onValue} disabled={!filterValue}>
            <SelectTrigger {...common}>
              <SelectValue placeholder={filterValue ? "Select pool…" : "Pick a category first"} />
            </SelectTrigger>
            <SelectContent>
              {opts.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No pools available</div>
              ) : opts.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      default:
        return (
          <Input
            {...common}
            type={
              field.type === "number" || field.type === "currency" ? "number" :
              field.type === "date" ? "date" :
              field.type === "datetime" ? "datetime-local" :
              field.type === "time" ? "time" :
              field.type === "email" ? "email" :
              field.type === "phone" ? "tel" :
              "text"
            }
            value={value ?? ""}
            onChange={(e) => onValue(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const renderField = (field: BaseField, parentKey?: string): React.ReactNode => {
    if (!isVisible(field.visibleWhen, values)) return null;

    if (field.type === "divider") return <Separator key={field.id} className="my-2" />;
    if (field.type === "info_banner") {
      const html = DOMPurify.sanitize(field.content || "");
      return (
        <div
          key={field.id}
          className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    if (field.type === "section") {
      return (
        <fieldset key={field.id} className="md:col-span-2 space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {field.label}
          </legend>
          {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
          <div className={cn("grid gap-3", cfg.twoColumnLayout && "md:grid-cols-2")}>
            {(field.fields ?? []).map((child) => renderField(child))}
          </div>
        </fieldset>
      );
    }
    if (field.type === "repeater") {
      const rows: Record<string, any>[] = Array.isArray(values[field.key]) ? values[field.key] : [];
      const max = field.maxRows ?? 99;
      const min = field.minRows ?? 1;
      const updateRow = (idx: number, key: string, v: any) => {
        const next = rows.map((r, i) => (i === idx ? { ...r, [key]: v } : r));
        setField(field.key, next);
      };
      const addRow = () => setField(field.key, [...rows, defaultRow(field.fields ?? [])]);
      const removeRow = (idx: number) => setField(field.key, rows.filter((_, i) => i !== idx));

      return (
        <fieldset key={field.id} className="md:col-span-2 space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {field.label}
          </legend>
          {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={idx} className="rounded-md border border-border/60 bg-muted/20 p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Row {idx + 1}</span>
                  {rows.length > min ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                <div className={cn("grid gap-2", cfg.twoColumnLayout && "md:grid-cols-2")}>
                  {(field.fields ?? []).map((child) => {
                    if (!isInputField(child.type)) return null;
                    const errKey = `${field.key}.${idx}.${child.key}`;
                    return (
                      <div key={child.id} className={cn("space-y-1", child.layout?.colSpan === 2 && "md:col-span-2")}>
                        <Label className="text-xs">
                          {child.label}{child.required ? <span className="text-destructive ml-0.5">*</span> : null}
                        </Label>
                        {renderInput(child, row[child.key], (v) => updateRow(idx, child.key, v), errKey)}
                        {errors[errKey] ? <p className="text-[11px] text-destructive">{errors[errKey]}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {rows.length < max ? (
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add row
            </Button>
          ) : null}
        </fieldset>
      );
    }

    // Standard / entity / computed fields.
    const colSpan = field.layout?.colSpan ?? 2;
    return (
      <div key={field.id} className={cn("space-y-1.5", colSpan === 2 && "md:col-span-2")}>
        <Label htmlFor={field.key} className="text-xs">
          {field.label}{field.required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
        {renderInput(field, values[field.key], (v) => setField(field.key, v), field.key)}
        {field.helpText ? <p className="text-[11px] text-muted-foreground">{field.helpText}</p> : null}
        {errors[field.key] ? <p className="text-[11px] text-destructive">{errors[field.key]}</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {draftKey ? (
        <DraftStatus restoredAt={draft.restoredAt} savedAt={draft.savedAt} onClear={draft.clear} />
      ) : null}
      <div className={cn("grid gap-3", cfg.twoColumnLayout && "md:grid-cols-2")}>
        {schema.fields.map((f) => renderField(f))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            {cfg.cancelLabel || "Cancel"}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {cfg.submitLabel || "Submit"}
        </Button>
      </div>
    </form>
  );
}
