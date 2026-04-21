import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IdCard, Cog, Gauge, CheckCircle2, AlertCircle, Building2, MapPin, Globe2, Layers } from "lucide-react";
import {
  PLATE_CODES, PLATE_REGIONS, VEHICLE_TYPES_OPTIONS, VEHICLE_GROUPS, DRIVE_TYPES,
  ENERGY_TYPES, ENERGY_SOURCES,
  PURPOSE_FOR_OPTIONS, TRANSMISSION_TYPES,
  CURRENT_CONDITION_OPTIONS, SAFETY_COMFORT_CATEGORIES,
  ASSIGNED_LOCATIONS,
} from "./formConstants";
import { DatePickerField } from "./DatePickerField";
import {
  sanitizeWhileTyping, sanitizeVin, sanitizePlateDigits, sanitizeNumeric,
} from "./formSanitizers";

type SetFn = (field: string, value: string | number) => void;
type BlurFn = (field: string, value: unknown) => void;
type ChangeFn = (field: string, value: unknown) => void;
type ErrFn = (field: string) => string | undefined;
type StatusFn = (field: string, value: unknown) => "neutral" | "success" | "error";

interface Props {
  formData: any;
  set: SetFn;
  plateNumber: string;
  onBlur?: BlurFn;
  onChange?: ChangeFn;
  getError?: ErrFn;
  getStatus?: StatusFn;
  /** Optional controlled sub-tab (identity | spec | value). */
  activeSubTab?: BasicSubTabId;
  onSubTabChange?: (id: BasicSubTabId) => void;
}

const tabs = [
  { id: "identity", label: "Identity",       icon: IdCard, hint: "Plate, purpose & assignment" },
  { id: "spec",     label: "Specifications", icon: Cog,    hint: "Make, engine & drivetrain" },
  { id: "value",    label: "Valuation",      icon: Gauge,  hint: "Pricing, capacity & class" },
] as const;

export type BasicSubTabId = typeof tabs[number]["id"];

// Single source of truth — drives both tab rendering AND completion math.
export const TAB_FIELDS: Record<BasicSubTabId, string[]> = {
  identity: ["plate_number_part", "purpose_for", "specific_pool", "specific_location", "assigned_location", "vehicle_type", "vehicle_group"],
  spec:     ["make", "model", "model_code", "year", "mfg_date", "color", "vin", "engine_number", "transmission_type", "drive_type", "engine_cc", "fuel_type"],
  value:    ["purchasing_price", "current_market_price", "current_condition", "fuel_standard_km_per_liter", "seating_capacity", "loading_capacity_quintal", "year_of_ownership", "safety_comfort_category"],
};

/** Reverse map: field → sub-tab. Useful for jumping to an errored field. */
export const BASIC_FIELD_TO_SUBTAB: Record<string, BasicSubTabId> = Object.entries(TAB_FIELDS)
  .reduce((acc, [tabId, fields]) => {
    fields.forEach((f) => { acc[f] = tabId as BasicSubTabId; });
    return acc;
  }, {} as Record<string, BasicSubTabId>);

export default function BasicInfoTabs({ formData, set, plateNumber, onBlur, onChange, getError, getStatus, activeSubTab, onSubTabChange }: Props) {
  const [internalActive, setInternalActive] = useState<BasicSubTabId>("identity");
  const active = activeSubTab ?? internalActive;
  const setActive = (id: BasicSubTabId) => {
    setInternalActive(id);
    onSubTabChange?.(id);
  };

  const completion = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, arr] of Object.entries(TAB_FIELDS)) {
      const filled = arr.filter(f => {
        const v = formData[f];
        return v !== "" && v !== undefined && v !== null;
      }).length;
      out[k] = filled / arr.length;
    }
    return out;
  }, [formData]);

  const overall = useMemo(() => {
    const vals = Object.values(completion);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [completion]);

  // Pass-through props for child panes
  const childProps = { formData, set, onBlur, onChange, getError, getStatus };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, hsl(var(--primary)/0.15), transparent 60%), radial-gradient(50% 50% at 90% 10%, hsl(var(--secondary)/0.12), transparent 60%)",
        }}
      />

      <div className="relative rounded-2xl border bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Basic Information</h3>
            <p className="text-xs text-muted-foreground">Ethio Telecom vehicle registration</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Complete</span>
            <span className="text-sm font-semibold tabular-nums w-10 text-right">{Math.round(overall * 100)}%</span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                style={{ width: `${overall * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Segmented pill tabs */}
        <LayoutGroup id="basic-info-tabs">
          <div className="px-3 md:px-5 pt-4">
            <div role="tablist" className="relative inline-flex flex-wrap gap-1 p-1 rounded-full border bg-muted/50 backdrop-blur">
              {tabs.map(t => {
                const isActive = active === t.id;
                const Icon = t.icon;
                const pct = Math.round((completion[t.id] ?? 0) * 100);
                return (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setActive(t.id)}
                    className={`relative z-10 px-4 py-2 rounded-full text-xs md:text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="basic-info-pill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/40"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                      <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20" : "bg-foreground/10"}`}>
                        {pct}%
                      </span>
                      {pct === 100 && <CheckCircle2 className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground pl-2">
              {tabs.find(t => t.id === active)?.hint}
            </p>
          </div>
        </LayoutGroup>

        {/* Tab content — only the active pane renders */}
        <div className="p-4 md:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {active === "identity" && <IdentityPane {...childProps} plateNumber={plateNumber} />}
              {active === "spec"     && <SpecPane     {...childProps} />}
              {active === "value"    && <ValuePane    {...childProps} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- Field primitive (matches InviteUserDialog UX) ----------
 *
 * Alignment guarantees:
 *  • `self-start` so a tall field (e.g. Plate Number with the live preview, or
 *    Assigned Location with the inline "Specific Location override") never
 *    stretches its row-mates vertically.
 *  • Label slot has a fixed `min-h-4` line — fields with and without hints
 *    line up their inputs perfectly across columns.
 *  • Hint/error slot reserves `min-h-4` so the input row never jumps when an
 *    error appears or a neighbouring field has a hint and this one doesn't.
 *  • Inputs/SelectTriggers inside are normalised to `h-10` via descendant
 *    selectors so heights match across the grid.
 */
function Field({
  label, required, hint, error, status = "neutral", children, span = 1, name,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  status?: "neutral" | "success" | "error";
  children: React.ReactNode;
  span?: 1 | 2 | 3;
  name?: string;
}) {
  const spanCls = span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  const isError = status === "error" || !!error;
  const isSuccess = status === "success" && !error;

  return (
    <div className={`space-y-1.5 self-start ${spanCls}`} data-field={name}>
      <Label className={`text-xs font-medium flex items-center gap-1 min-h-4 leading-4 ${isError ? "text-destructive" : "text-foreground/80"}`}>
        <span className="truncate">{label}</span>
        {required && <span className="text-primary">*</span>}
      </Label>
      <div
        className={`relative [&_input]:h-10 [&>button]:h-10 ${
          isError
            ? "[&_input]:border-destructive [&_button]:border-destructive [&_input]:focus-visible:ring-destructive/30"
            : isSuccess
              ? "[&_input]:border-success/60 [&_button]:border-success/60 [&_input]:focus-visible:ring-success/30"
              : ""
        }`}
      >
        {children}
        {isSuccess && (
          <CheckCircle2
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-success"
          />
        )}
      </div>
      {/* Reserve a constant-height row for hint/error so neighbouring fields don't shift */}
      <div className="min-h-4">
        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </p>
        ) : hint ? (
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Pool Category visual chip ---------- */
const POOL_META: Record<string, { icon: typeof Building2; tone: string; desc: string }> = {
  Corporate: { icon: Building2, tone: "text-blue-500 bg-blue-500/10 ring-blue-500/20",   desc: "Head office assets" },
  Zone:      { icon: Layers,    tone: "text-amber-500 bg-amber-500/10 ring-amber-500/20", desc: "Zonal pool" },
  Region:    { icon: Globe2,    tone: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20", desc: "Regional pool" },
};

function PoolCategoryChip({ value, compact = false }: { value: string; compact?: boolean }) {
  const meta = POOL_META[value];
  if (!meta) return <span>{value}</span>;
  const Icon = meta.icon;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${meta.tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex flex-col min-w-0 leading-tight">
        <span className="text-sm font-medium truncate">{value}</span>
        {!compact && <span className="text-[10px] text-muted-foreground truncate">{meta.desc}</span>}
      </span>
    </span>
  );
}

/* ---------- Specific Location override (collapsed by default) ---------- */
function SpecificLocationOverride({
  poolCategory,
  assignedValue,
  specificValue,
  onChange,
}: {
  poolCategory: string;
  assignedValue: string;
  specificValue: string;
  onChange: (v: string) => void;
}) {
  const isOverridden = specificValue && specificValue !== assignedValue;
  const [open, setOpen] = useState(isOverridden);
  const options = useMemo(
    () => ASSIGNED_LOCATIONS.filter(l => l.group === poolCategory),
    [poolCategory],
  );
  const currentLabel =
    ASSIGNED_LOCATIONS.find(l => l.value === specificValue)?.label || specificValue;

  if (!open) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          Specific Location: <span className="text-foreground font-medium">{currentLabel}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-primary hover:underline underline-offset-2"
        >
          Override
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Specific Location override</span>
        <button
          type="button"
          onClick={() => {
            onChange(assignedValue);
            setOpen(false);
          }}
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Reset to Assigned
        </button>
      </div>
      <Select value={specificValue} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Pick a different location" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------- Pane prop helpers ---------- */
type PaneProps = Omit<Props, "plateNumber"> & { plateNumber?: string };

function usePaneHandlers({ formData, set, onBlur, onChange, getError, getStatus }: PaneProps) {
  const err = (k: string) => getError?.(k);
  const stat = (k: string) => getStatus?.(k, formData[k]) ?? "neutral";
  const blur = (k: string) => () => onBlur?.(k, formData[k]);
  /** Set + (optionally) live-validate after first blur. */
  const change = (k: string, v: string | number) => {
    set(k, v);
    onChange?.(k, v);
  };
  /** For Selects — committing a value should immediately validate. */
  const commitSelect = (k: string, v: string) => {
    set(k, v);
    onBlur?.(k, v);
  };
  return { err, stat, blur, change, commitSelect };
}

/* ----- Tab 1: Identity ----- */
function IdentityPane(props: PaneProps) {
  const { formData, plateNumber, set } = props;
  const { err, stat, blur, change, commitSelect } = usePaneHandlers(props);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 items-start">
      <Field name="plate_number_part" label="Plate Number" required span={3} error={err("plate_number_part")} status={stat("plate_number_part")}>
        <div className="grid grid-cols-3 gap-2">
          <Select value={formData.plate_code} onValueChange={v => set("plate_code", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLATE_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={formData.plate_region} onValueChange={v => set("plate_region", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLATE_REGIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            value={formData.plate_number_part}
            onChange={e => change("plate_number_part", sanitizePlateDigits(e.target.value))}
            onBlur={blur("plate_number_part")}
            placeholder="12345"
            maxLength={5}
            inputMode="numeric"
          />
        </div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
          <span className="text-sm font-mono font-semibold">{plateNumber}</span>
        </div>
      </Field>

      <Field name="purpose_for" label="Purpose For" error={err("purpose_for")} status={stat("purpose_for")}>
        <Select value={formData.purpose_for || ""} onValueChange={v => commitSelect("purpose_for", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {PURPOSE_FOR_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field name="specific_pool" label="Pool Category" hint="Corporate / Zone / Region" error={err("specific_pool")} status={stat("specific_pool")}>
        <Select
          value={formData.specific_pool || ""}
          onValueChange={v => {
            commitSelect("specific_pool", v);
            // Reset dependents when category changes
            const cur = ASSIGNED_LOCATIONS.find(l => l.value === formData.assigned_location);
            if (!cur || cur.group !== v) {
              commitSelect("assigned_location", "");
              commitSelect("specific_location", "");
            }
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select category...">
              {formData.specific_pool && <PoolCategoryChip value={formData.specific_pool} />}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Corporate">
              <PoolCategoryChip value="Corporate" />
            </SelectItem>
            <SelectItem value="Zone">
              <PoolCategoryChip value="Zone" />
            </SelectItem>
            <SelectItem value="Region">
              <PoolCategoryChip value="Region" />
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field name="assigned_location" label="Assigned Location" hint="Filtered by Pool Category — also fills Specific Location" error={err("assigned_location")} status={stat("assigned_location")} span={2}>
        <Select
          value={formData.assigned_location || ""}
          onValueChange={v => {
            commitSelect("assigned_location", v);
            // Mirror the pick into Specific Location (single source of truth by default)
            commitSelect("specific_location", v);
          }}
          disabled={!formData.specific_pool}
        >
          <SelectTrigger className={`h-10 ${!formData.specific_pool ? "opacity-50" : ""}`}>
            <SelectValue placeholder={formData.specific_pool ? "Select location..." : "Pick category first"}>
              {formData.assigned_location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">
                    {ASSIGNED_LOCATIONS.find(l => l.value === formData.assigned_location)?.label || formData.assigned_location}
                  </span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {ASSIGNED_LOCATIONS
              .filter(l => l.group === formData.specific_pool)
              .map(l => (
                <SelectItem key={l.value} value={l.value}>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {l.label}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {formData.assigned_location && (
          <SpecificLocationOverride
            poolCategory={formData.specific_pool}
            assignedValue={formData.assigned_location}
            specificValue={formData.specific_location || ""}
            onChange={v => commitSelect("specific_location", v)}
          />
        )}
      </Field>

      <Field name="vehicle_type" label="Vehicle Type" error={err("vehicle_type")} status={stat("vehicle_type")}>
        <Select value={formData.vehicle_type} onValueChange={v => commitSelect("vehicle_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field name="vehicle_group" label="Group" error={err("vehicle_group")} status={stat("vehicle_group")}>
        <Select value={formData.vehicle_group} onValueChange={v => commitSelect("vehicle_group", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ----- Tab 2: Specifications ----- */
function SpecPane(props: PaneProps) {
  const { formData, set } = props;
  const { err, stat, blur, change, commitSelect } = usePaneHandlers(props);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 items-start">
      <Field name="make" label="Make" required error={err("make")} status={stat("make")}>
        <Input value={formData.make} onChange={e => change("make", sanitizeWhileTyping(e.target.value).slice(0, 100))} onBlur={blur("make")} placeholder="e.g. Toyota" maxLength={100} />
      </Field>
      <Field name="model" label="Model" required error={err("model")} status={stat("model")}>
        <Input value={formData.model} onChange={e => change("model", sanitizeWhileTyping(e.target.value).slice(0, 100))} onBlur={blur("model")} placeholder="e.g. Hilux" maxLength={100} />
      </Field>
      <Field name="model_code" label="Model Code" error={err("model_code")} status={stat("model_code")}>
        <Input value={formData.model_code || ""} onChange={e => change("model_code", sanitizeWhileTyping(e.target.value).slice(0, 50))} onBlur={blur("model_code")} placeholder="e.g. DD1022T" maxLength={50} />
      </Field>

      <Field name="year" label="Manufactured Year" required error={err("year")} status={stat("year")}>
        <Input
          type="number"
          inputMode="numeric"
          value={formData.year}
          onChange={e => change("year", parseInt(e.target.value) || new Date().getFullYear())}
          onBlur={blur("year")}
          placeholder="YYYY"
        />
      </Field>
      <Field name="mfg_date" label="MFG Year" hint="Factory year (optional)" error={err("mfg_date")} status={stat("mfg_date")}>
        <Input
          type="number"
          inputMode="numeric"
          min={1900}
          max={new Date().getFullYear()}
          placeholder="YYYY"
          value={formData.mfg_date ? formData.mfg_date.slice(0, 4) : ""}
          onChange={e => {
            const yr = e.target.value.replace(/\D/g, "").slice(0, 4);
            const iso = yr.length === 4 ? `${yr}-01-01` : "";
            set("mfg_date", iso);
            change("mfg_date", iso);
          }}
          onBlur={blur("mfg_date")}
        />
      </Field>
      <Field name="color" label="Color" error={err("color")} status={stat("color")}>
        <Input value={formData.color} onChange={e => change("color", sanitizeWhileTyping(e.target.value).slice(0, 40))} onBlur={blur("color")} placeholder="e.g. White" maxLength={40} />
      </Field>

      <Field name="vin" label="Chassis Number (VIN)" span={2} error={err("vin")} status={stat("vin")}>
        <Input
          value={formData.vin}
          onChange={e => change("vin", sanitizeVin(e.target.value))}
          onBlur={blur("vin")}
          maxLength={17}
          placeholder="17-character VIN (no I, O, Q)"
        />
      </Field>
      <Field name="engine_number" label="Engine Number" error={err("engine_number")} status={stat("engine_number")}>
        <Input value={formData.engine_number || ""} onChange={e => change("engine_number", sanitizeWhileTyping(e.target.value).slice(0, 50))} onBlur={blur("engine_number")} placeholder="e.g. 4JB1TI-XXXX" maxLength={50} />
      </Field>

      <Field name="transmission_type" label="Transmission" error={err("transmission_type")} status={stat("transmission_type")}>
        <Select value={formData.transmission_type || ""} onValueChange={v => commitSelect("transmission_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {TRANSMISSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field name="drive_type" label="Drive Type" error={err("drive_type")} status={stat("drive_type")}>
        <Select value={formData.drive_type} onValueChange={v => commitSelect("drive_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {DRIVE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field name="engine_cc" label="Engine CC" error={err("engine_cc")} status={stat("engine_cc")}>
        <Input
          inputMode="numeric"
          value={formData.engine_cc || ""}
          onChange={e => change("engine_cc", sanitizeNumeric(e.target.value, { integer: true }))}
          onBlur={blur("engine_cc")}
          placeholder="e.g. 2495"
        />
      </Field>

      <Field name="fuel_type" label="Energy Type" span={3} error={err("fuel_type")} status={stat("fuel_type")}>
        <Select value={formData.fuel_type} onValueChange={v => commitSelect("fuel_type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENERGY_SOURCES.map(src => (
              <SelectGroup key={src.value}>
                <SelectLabel className="text-xs font-semibold text-muted-foreground">{src.label}</SelectLabel>
                {ENERGY_TYPES.filter(e => e.source === src.value).map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ----- Tab 3: Valuation ----- */
function ValuePane(props: PaneProps) {
  const { formData, set } = props;
  const { err, stat, blur, change, commitSelect } = usePaneHandlers(props);

  const age = formData.year ? Math.max(0, new Date().getFullYear() - Number(formData.year)) : null;
  const depreciation =
    formData.purchasing_price && formData.current_market_price
      ? Math.max(0, Math.round((1 - Number(formData.current_market_price) / Number(formData.purchasing_price)) * 100))
      : null;

  return (
    <div className="space-y-5">
      {/* Capacity row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 items-start">
        <Field name="seating_capacity" label="Seating Capacity" error={err("seating_capacity")} status={stat("seating_capacity")}>
          <Input inputMode="numeric" value={formData.seating_capacity || ""} onChange={e => change("seating_capacity", sanitizeNumeric(e.target.value, { integer: true }))} onBlur={blur("seating_capacity")} placeholder="e.g. 4" />
        </Field>
        <Field name="loading_capacity_quintal" label="Loading Capacity (Quintal)" error={err("loading_capacity_quintal")} status={stat("loading_capacity_quintal")}>
          <Input inputMode="decimal" value={formData.loading_capacity_quintal || ""} onChange={e => change("loading_capacity_quintal", sanitizeNumeric(e.target.value))} onBlur={blur("loading_capacity_quintal")} placeholder="e.g. 7" />
        </Field>
        <Field name="fuel_standard_km_per_liter" label="Fuel Standard (km/L)" error={err("fuel_standard_km_per_liter")} status={stat("fuel_standard_km_per_liter")}>
          <Input inputMode="decimal" value={formData.fuel_standard_km_per_liter || ""} onChange={e => change("fuel_standard_km_per_liter", sanitizeNumeric(e.target.value))} onBlur={blur("fuel_standard_km_per_liter")} placeholder="e.g. 12.5" />
        </Field>
      </div>

      {/* Pricing row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 items-start">
        <Field name="year_of_ownership" label="Year of Ownership" error={err("year_of_ownership")} status={stat("year_of_ownership")}>
          <Input inputMode="numeric" value={formData.year_of_ownership || ""} onChange={e => change("year_of_ownership", sanitizeNumeric(e.target.value, { integer: true }))} onBlur={blur("year_of_ownership")} placeholder="YYYY" />
        </Field>
        <Field name="purchasing_price" label="Purchasing Price (ETB)" error={err("purchasing_price")} status={stat("purchasing_price")}>
          <Input inputMode="decimal" value={formData.purchasing_price || ""} onChange={e => change("purchasing_price", sanitizeNumeric(e.target.value))} onBlur={blur("purchasing_price")} placeholder="0" />
        </Field>
        <Field name="current_market_price" label="Current Market Price (ETB)" error={err("current_market_price")} status={stat("current_market_price")}>
          <Input inputMode="decimal" value={formData.current_market_price || ""} onChange={e => change("current_market_price", sanitizeNumeric(e.target.value))} onBlur={blur("current_market_price")} placeholder="0" />
        </Field>
      </div>

      {/* Auto-derived KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        <KpiCard label="Vehicle Age" value={age !== null ? `${age} yrs` : "—"} />
        <KpiCard label="Depreciation" value={depreciation !== null ? `${depreciation}%` : "—"} accent />
      </div>

      {/* Condition */}
      <Field name="current_condition" label="Current Condition" error={err("current_condition")} status={stat("current_condition")}>
        <Select value={formData.current_condition || ""} onValueChange={v => commitSelect("current_condition", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {CURRENT_CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      {/* Safety & Comfort tier — visual selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground/80">Safety & Comfort Class</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {SAFETY_COMFORT_CATEGORIES.map(s => {
            const isActive = formData.safety_comfort_category === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => set("safety_comfort_category", s.value)}
                className={`relative px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  isActive
                    ? "border-primary bg-gradient-to-br from-primary/15 to-secondary/10 text-foreground shadow-md shadow-primary/20"
                    : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground bg-card"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20" : "bg-muted/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
