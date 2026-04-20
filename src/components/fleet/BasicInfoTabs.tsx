import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IdCard, Cog, Gauge, CheckCircle2 } from "lucide-react";
import {
  PLATE_CODES, PLATE_REGIONS, VEHICLE_TYPES_OPTIONS, VEHICLE_GROUPS, DRIVE_TYPES,
  ENERGY_TYPES, ENERGY_SOURCES,
  PURPOSE_FOR_OPTIONS, SPECIFIC_POOL_OPTIONS, TRANSMISSION_TYPES,
  CURRENT_CONDITION_OPTIONS, SAFETY_COMFORT_CATEGORIES, ASSIGNED_LOCATIONS,
} from "./formConstants";

type SetFn = (field: string, value: string | number) => void;
type BlurFn = (field: string, value: unknown) => void;
type ErrFn = (field: string) => string | undefined;

interface Props {
  formData: any;
  set: SetFn;
  plateNumber: string;
  onBlur?: BlurFn;
  getError?: ErrFn;
}

const tabs = [
  { id: "identity", label: "Identity",       icon: IdCard, hint: "Plate, purpose & assignment" },
  { id: "spec",     label: "Specifications", icon: Cog,    hint: "Make, engine & drivetrain" },
  { id: "value",    label: "Valuation",      icon: Gauge,  hint: "Pricing, capacity & class" },
] as const;

// Single source of truth — drives both tab rendering AND completion math.
const TAB_FIELDS: Record<typeof tabs[number]["id"], string[]> = {
  identity: ["plate_number_part", "purpose_for", "specific_pool", "specific_location", "assigned_location", "vehicle_type", "vehicle_group"],
  spec:     ["make", "model", "model_code", "year", "mfg_date", "color", "vin", "engine_number", "transmission_type", "drive_type", "engine_cc", "fuel_type"],
  value:    ["purchasing_price", "current_market_price", "current_condition", "fuel_standard_km_per_liter", "seating_capacity", "loading_capacity_quintal", "year_of_ownership", "safety_comfort_category"],
};

export default function BasicInfoTabs({ formData, set, plateNumber, onBlur, getError }: Props) {
  const [active, setActive] = useState<typeof tabs[number]["id"]>("identity");

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

        {/* Tab content — only the active pane renders, no redundancy */}
        <div className="p-4 md:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {active === "identity" && <IdentityPane formData={formData} set={set} plateNumber={plateNumber} />}
              {active === "spec"     && <SpecPane     formData={formData} set={set} />}
              {active === "value"    && <ValuePane    formData={formData} set={set} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- Field primitive ---------- */
function Field({ label, required, hint, error, children, span = 1 }: {
  label: string; required?: boolean; hint?: string; error?: string;
  children: React.ReactNode; span?: 1 | 2 | 3;
}) {
  const spanCls = span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={`space-y-1.5 ${spanCls}`}>
      <Label className={`text-xs font-medium flex items-center gap-1 ${error ? "text-destructive" : "text-foreground/80"}`}>
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      <div className={error ? "[&_input]:border-destructive [&_button]:border-destructive [&_input]:ring-destructive/20" : ""}>
        {children}
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ----- Tab 1: Identity (plate, purpose, location, type/group) ----- */
function IdentityPane({ formData, set, plateNumber, onBlur, getError }: Props) {
  const err = (k: string) => getError?.(k);
  const blur = (k: string) => () => onBlur?.(k, formData[k]);
  const blurSelect = (k: string, v: string) => { set(k, v); onBlur?.(k, v); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Plate Number" required span={3} error={err("plate_number_part")}>
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
            onChange={e => set("plate_number_part", e.target.value.replace(/\D/g, "").slice(0, 5))}
            onBlur={blur("plate_number_part")}
            placeholder="12345"
            maxLength={5}
          />
        </div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
          <span className="text-sm font-mono font-semibold">{plateNumber}</span>
        </div>
      </Field>

      <Field label="Purpose For" required error={err("purpose_for")}>
        <Select value={formData.purpose_for || ""} onValueChange={v => blurSelect("purpose_for", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {PURPOSE_FOR_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Specific Pool" error={err("specific_pool")}>
        <Select value={formData.specific_pool || ""} onValueChange={v => blurSelect("specific_pool", v)}>
          <SelectTrigger><SelectValue placeholder="e.g. NAAZ, SR..." /></SelectTrigger>
          <SelectContent>
            {SPECIFIC_POOL_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Specific Location" error={err("specific_location")}>
        <Input value={formData.specific_location || ""} onChange={e => set("specific_location", e.target.value)} onBlur={blur("specific_location")} placeholder="Branch / site name" />
      </Field>

      <Field label="Assigned Location" hint="Corporate / Zone / Region group" error={err("assigned_location")}>
        <Select value={formData.assigned_location || ""} onValueChange={v => blurSelect("assigned_location", v)}>
          <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
          <SelectContent>
            {["Corporate", "Zone", "Region"].map(group => (
              <SelectGroup key={group}>
                <SelectLabel className="text-xs font-semibold text-muted-foreground">{group}</SelectLabel>
                {ASSIGNED_LOCATIONS.filter(l => l.group === group).map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Vehicle Type" required error={err("vehicle_type")}>
        <Select value={formData.vehicle_type} onValueChange={v => blurSelect("vehicle_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Group" required error={err("vehicle_group")}>
        <Select value={formData.vehicle_group} onValueChange={v => blurSelect("vehicle_group", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ----- Tab 2: Specifications (make/model, identifiers, drivetrain, energy) ----- */
function SpecPane({ formData, set, onBlur, getError }: { formData: any; set: SetFn; onBlur?: BlurFn; getError?: ErrFn }) {
  const err = (k: string) => getError?.(k);
  const blur = (k: string) => () => onBlur?.(k, formData[k]);
  const blurSelect = (k: string, v: string) => { set(k, v); onBlur?.(k, v); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Make" required error={err("make")}><Input value={formData.make} onChange={e => set("make", e.target.value)} onBlur={blur("make")} placeholder="e.g. Toyota" maxLength={100} /></Field>
      <Field label="Model" required error={err("model")}><Input value={formData.model} onChange={e => set("model", e.target.value)} onBlur={blur("model")} placeholder="e.g. Hilux" maxLength={100} /></Field>
      <Field label="Model Code" error={err("model_code")}><Input value={formData.model_code || ""} onChange={e => set("model_code", e.target.value)} onBlur={blur("model_code")} placeholder="e.g. DD1022T" maxLength={50} /></Field>

      <Field label="Manufactured Year" required error={err("year")}>
        <Input type="number" value={formData.year} onChange={e => set("year", parseInt(e.target.value) || new Date().getFullYear())} onBlur={blur("year")} placeholder="YYYY" />
      </Field>
      <Field label="MFG Date" hint="Exact factory date (optional)" error={err("mfg_date")}>
        <Input type="date" value={formData.mfg_date || ""} onChange={e => set("mfg_date", e.target.value)} onBlur={blur("mfg_date")} />
      </Field>
      <Field label="Color" error={err("color")}><Input value={formData.color} onChange={e => set("color", e.target.value)} onBlur={blur("color")} placeholder="e.g. White" maxLength={40} /></Field>

      <Field label="Chassis Number (VIN)" span={2} error={err("vin")}>
        <Input value={formData.vin} onChange={e => set("vin", e.target.value.toUpperCase())} onBlur={blur("vin")} maxLength={17} placeholder="17-character VIN" />
      </Field>
      <Field label="Engine Number" error={err("engine_number")}>
        <Input value={formData.engine_number || ""} onChange={e => set("engine_number", e.target.value)} onBlur={blur("engine_number")} placeholder="e.g. 4JB1TI-XXXX" maxLength={50} />
      </Field>

      <Field label="Transmission" required error={err("transmission_type")}>
        <Select value={formData.transmission_type || ""} onValueChange={v => blurSelect("transmission_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {TRANSMISSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Drive Type" required error={err("drive_type")}>
        <Select value={formData.drive_type} onValueChange={v => blurSelect("drive_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {DRIVE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Engine CC" error={err("engine_cc")}>
        <Input type="number" min={0} value={formData.engine_cc || ""} onChange={e => set("engine_cc", e.target.value)} onBlur={blur("engine_cc")} placeholder="e.g. 2495" />
      </Field>

      <Field label="Energy Type" required span={3} error={err("fuel_type")}>
        <Select value={formData.fuel_type} onValueChange={v => blurSelect("fuel_type", v)}>
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

/* ----- Tab 3: Valuation (capacity, pricing, condition, class) ----- */
function ValuePane({ formData, set, onBlur, getError }: { formData: any; set: SetFn; onBlur?: BlurFn; getError?: ErrFn }) {
  const err = (k: string) => getError?.(k);
  const blur = (k: string) => () => onBlur?.(k, formData[k]);
  const blurSelect = (k: string, v: string) => { set(k, v); onBlur?.(k, v); };
  const age = formData.year ? Math.max(0, new Date().getFullYear() - Number(formData.year)) : null;
  const depreciation =
    formData.purchasing_price && formData.current_market_price
      ? Math.max(0, Math.round((1 - Number(formData.current_market_price) / Number(formData.purchasing_price)) * 100))
      : null;

  return (
    <div className="space-y-5">
      {/* Capacity row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Seating Capacity" error={err("seating_capacity")}>
          <Input type="number" min={0} value={formData.seating_capacity || ""} onChange={e => set("seating_capacity", e.target.value)} onBlur={blur("seating_capacity")} placeholder="e.g. 4" />
        </Field>
        <Field label="Loading Capacity (Quintal)" error={err("loading_capacity_quintal")}>
          <Input type="number" min={0} step="0.1" value={formData.loading_capacity_quintal || ""} onChange={e => set("loading_capacity_quintal", e.target.value)} onBlur={blur("loading_capacity_quintal")} placeholder="e.g. 7" />
        </Field>
        <Field label="Fuel Standard (km/L)" error={err("fuel_standard_km_per_liter")}>
          <Input type="number" min={0} step="0.1" value={formData.fuel_standard_km_per_liter || ""} onChange={e => set("fuel_standard_km_per_liter", e.target.value)} onBlur={blur("fuel_standard_km_per_liter")} placeholder="e.g. 12.5" />
        </Field>
      </div>

      {/* Pricing row + auto stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Year of Ownership" error={err("year_of_ownership")}>
          <Input type="number" value={formData.year_of_ownership || ""} onChange={e => set("year_of_ownership", e.target.value)} onBlur={blur("year_of_ownership")} placeholder="YYYY" />
        </Field>
        <Field label="Purchasing Price (ETB)" error={err("purchasing_price")}>
          <Input type="number" min={0} value={formData.purchasing_price || ""} onChange={e => set("purchasing_price", e.target.value)} onBlur={blur("purchasing_price")} placeholder="0" />
        </Field>
        <Field label="Current Market Price (ETB)" error={err("current_market_price")}>
          <Input type="number" min={0} value={formData.current_market_price || ""} onChange={e => set("current_market_price", e.target.value)} onBlur={blur("current_market_price")} placeholder="0" />
        </Field>
      </div>

      {/* Auto-derived KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        <KpiCard label="Vehicle Age" value={age !== null ? `${age} yrs` : "—"} />
        <KpiCard label="Depreciation" value={depreciation !== null ? `${depreciation}%` : "—"} accent />
      </div>

      {/* Condition */}
      <Field label="Current Condition" error={err("current_condition")}>
        <Select value={formData.current_condition || ""} onValueChange={v => blurSelect("current_condition", v)}>
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
