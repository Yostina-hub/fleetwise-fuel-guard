import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  IdCard, Cog, Banknote, ShieldCheck, Sparkles, CheckCircle2,
} from "lucide-react";
import {
  PLATE_CODES, PLATE_REGIONS, VEHICLE_TYPES_OPTIONS, VEHICLE_GROUPS, DRIVE_TYPES,
  ROUTE_TYPES, ENERGY_TYPES, ENERGY_SOURCES, VEHICLE_CATEGORIES,
  PURPOSE_FOR_OPTIONS, SPECIFIC_POOL_OPTIONS, TRANSMISSION_TYPES,
  CURRENT_CONDITION_OPTIONS, SAFETY_COMFORT_CATEGORIES,
} from "./formConstants";

type SetFn = (field: string, value: string | number) => void;

interface Props {
  formData: any;
  set: SetFn;
  plateNumber: string;
}

const tabs = [
  { id: "identity",   label: "Identity",   icon: IdCard,      hint: "Plate, purpose & location" },
  { id: "spec",       label: "Specs",      icon: Cog,         hint: "Make, engine & transmission" },
  { id: "commercial", label: "Commercial", icon: Banknote,    hint: "Price, condition & fuel" },
  { id: "category",   label: "Category",   icon: ShieldCheck, hint: "Safety & comfort tier" },
] as const;

export default function BasicInfoTabs({ formData, set, plateNumber }: Props) {
  const [active, setActive] = useState<typeof tabs[number]["id"]>("identity");

  // Per-tab completion ratio (drives the glowing progress ring)
  const completion = useMemo(() => {
    const fields: Record<string, string[]> = {
      identity:   ["plate_number_part", "purpose_for", "specific_pool", "specific_location", "vehicle_type", "vehicle_group"],
      spec:       ["make", "model", "year", "color", "engine_number", "vin", "transmission_type", "drive_type", "engine_cc", "fuel_type"],
      commercial: ["purchasing_price", "current_market_price", "current_condition", "fuel_standard_km_per_liter", "seating_capacity", "loading_capacity_quintal", "year_of_ownership", "mfg_date"],
      category:   ["vehicle_category", "safety_comfort_category", "model_code", "route_type"],
    };
    const out: Record<string, number> = {};
    for (const [k, arr] of Object.entries(fields)) {
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
      {/* Aurora glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, hsl(var(--primary)/0.18), transparent 60%), radial-gradient(50% 50% at 90% 10%, hsl(var(--secondary)/0.15), transparent 60%)",
        }}
      />

      <div className="relative rounded-2xl border bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 md:p-5 border-b bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/30">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping opacity-75" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Basic Information</h3>
              <p className="text-xs text-muted-foreground">Per Ethio Telecom vehicle registration spec</p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Completion</div>
              <div className="text-sm font-semibold tabular-nums">{Math.round(overall * 100)}%</div>
            </div>
            <ProgressRing value={overall} />
          </div>
        </div>

        {/* Segmented pill tabs with animated indicator */}
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
                    aria-selected={isActive}
                    onClick={() => setActive(t.id)}
                    className={`relative z-10 px-3.5 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium inline-flex items-center gap-2 transition-colors ${
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

        {/* Tab content */}
        <div className="p-4 md:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {active === "identity"   && <IdentityPane   formData={formData} set={set} plateNumber={plateNumber} />}
              {active === "spec"       && <SpecPane       formData={formData} set={set} />}
              {active === "commercial" && <CommercialPane formData={formData} set={set} />}
              {active === "category"   && <CategoryPane   formData={formData} set={set} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ProgressRing({ value }: { value: number }) {
  const r = 16, c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  return (
    <div className="relative w-10 h-10">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
        <circle
          cx="20" cy="20" r={r}
          stroke="url(#bi-grad)" strokeWidth="3" fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
        <defs>
          <linearGradient id="bi-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Field({ label, required, hint, children, span = 1 }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode; span?: 1 | 2 | 3;
}) {
  const spanCls = span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={`space-y-1.5 ${spanCls}`}>
      <Label className="text-xs font-medium text-foreground/80 flex items-center gap-1">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ----- Tab: Identity ----- */
function IdentityPane({ formData, set, plateNumber }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Plate Number" required span={3}>
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
            placeholder="12345"
            maxLength={5}
          />
        </div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
          <span className="text-sm font-mono font-semibold">{plateNumber}</span>
        </div>
      </Field>

      <Field label="Purpose For" required>
        <Select value={formData.purpose_for || ""} onValueChange={v => set("purpose_for", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {PURPOSE_FOR_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Specific Pool">
        <Select value={formData.specific_pool || ""} onValueChange={v => set("specific_pool", v)}>
          <SelectTrigger><SelectValue placeholder="e.g. NAAZ, SR..." /></SelectTrigger>
          <SelectContent>
            {SPECIFIC_POOL_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Specific Location">
        <Input value={formData.specific_location || ""} onChange={e => set("specific_location", e.target.value)} placeholder="Branch / site name" />
      </Field>

      <Field label="Vehicle Type" required>
        <Select value={formData.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Group" required>
        <Select value={formData.vehicle_group} onValueChange={v => set("vehicle_group", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Route Type" required>
        <Select value={formData.route_type} onValueChange={v => set("route_type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROUTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ----- Tab: Specs ----- */
function SpecPane({ formData, set }: { formData: any; set: SetFn }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Make" required><Input value={formData.make} onChange={e => set("make", e.target.value)} placeholder="e.g. Toyota" /></Field>
      <Field label="Model" required><Input value={formData.model} onChange={e => set("model", e.target.value)} placeholder="e.g. Hilux" /></Field>
      <Field label="Model Code"><Input value={formData.model_code || ""} onChange={e => set("model_code", e.target.value)} placeholder="e.g. DD1022T" /></Field>

      <Field label="Manufactured Year" required>
        <Input type="number" value={formData.year} onChange={e => set("year", parseInt(e.target.value) || new Date().getFullYear())} placeholder="YYYY" />
      </Field>
      <Field label="MFG Date">
        <Input type="date" value={formData.mfg_date || ""} onChange={e => set("mfg_date", e.target.value)} />
      </Field>
      <Field label="Color"><Input value={formData.color} onChange={e => set("color", e.target.value)} placeholder="e.g. White" /></Field>

      <Field label="Chassis Number (VIN)" span={2}>
        <Input value={formData.vin} onChange={e => set("vin", e.target.value)} maxLength={17} placeholder="17-character VIN" />
      </Field>
      <Field label="Engine Number">
        <Input value={formData.engine_number || ""} onChange={e => set("engine_number", e.target.value)} placeholder="e.g. 4JB1TI-XXXX" />
      </Field>

      <Field label="Transmission" required>
        <Select value={formData.transmission_type || ""} onValueChange={v => set("transmission_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {TRANSMISSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Drive Type" required>
        <Select value={formData.drive_type} onValueChange={v => set("drive_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {DRIVE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Engine Displacement (CC)">
        <Input type="number" min={0} value={formData.engine_cc || ""} onChange={e => set("engine_cc", e.target.value)} placeholder="e.g. 2495" />
      </Field>

      <Field label="Energy Type" span={3}>
        <Select value={formData.fuel_type} onValueChange={v => set("fuel_type", v)}>
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

/* ----- Tab: Commercial ----- */
function CommercialPane({ formData, set }: { formData: any; set: SetFn }) {
  const age = formData.year ? new Date().getFullYear() - Number(formData.year) : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Year of Ownership">
        <Input type="number" value={formData.year_of_ownership || ""} onChange={e => set("year_of_ownership", e.target.value)} placeholder="YYYY" />
      </Field>
      <Field label="Vehicle Age" hint="Auto-calculated from manufactured year">
        <Input value={age !== null ? `${age} years` : "—"} disabled />
      </Field>
      <Field label="Current Condition">
        <Select value={formData.current_condition || ""} onValueChange={v => set("current_condition", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {CURRENT_CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Seating Capacity">
        <Input type="number" min={0} value={formData.seating_capacity || ""} onChange={e => set("seating_capacity", e.target.value)} placeholder="e.g. 4" />
      </Field>
      <Field label="Loading Capacity (Quintal)">
        <Input type="number" min={0} step="0.1" value={formData.loading_capacity_quintal || ""} onChange={e => set("loading_capacity_quintal", e.target.value)} placeholder="e.g. 7" />
      </Field>
      <Field label="Fuel Standard (km/L)">
        <Input type="number" min={0} step="0.1" value={formData.fuel_standard_km_per_liter || ""} onChange={e => set("fuel_standard_km_per_liter", e.target.value)} placeholder="e.g. 12.5" />
      </Field>

      <Field label="Purchasing Price (ETB)">
        <Input type="number" min={0} value={formData.purchasing_price || ""} onChange={e => set("purchasing_price", e.target.value)} placeholder="0" />
      </Field>
      <Field label="Current Market Price (ETB)">
        <Input type="number" min={0} value={formData.current_market_price || ""} onChange={e => set("current_market_price", e.target.value)} placeholder="0" />
      </Field>
      <Field label="Depreciation" hint="Auto-derived from prices">
        <Input
          value={
            formData.purchasing_price && formData.current_market_price
              ? `${Math.max(0, Math.round((1 - Number(formData.current_market_price) / Number(formData.purchasing_price)) * 100))}%`
              : "—"
          }
          disabled
        />
      </Field>
    </div>
  );
}

/* ----- Tab: Category ----- */
function CategoryPane({ formData, set }: { formData: any; set: SetFn }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Vehicle Category">
        <Select value={formData.vehicle_category} onValueChange={v => set("vehicle_category", v)}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Safety & Comfort Category">
        <Select value={formData.safety_comfort_category || ""} onValueChange={v => set("safety_comfort_category", v)}>
          <SelectTrigger><SelectValue placeholder="Select tier..." /></SelectTrigger>
          <SelectContent>
            {SAFETY_COMFORT_CATEGORIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      {/* Visual category cards */}
      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
        {SAFETY_COMFORT_CATEGORIES.map(s => {
          const isActive = formData.safety_comfort_category === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => set("safety_comfort_category", s.value)}
              className={`relative p-3 rounded-xl border text-xs font-medium transition-all overflow-hidden ${
                isActive
                  ? "border-primary shadow-md shadow-primary/30 bg-gradient-to-br from-primary/10 to-secondary/10"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="cat-pill"
                  className="absolute inset-0 ring-2 ring-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <div className="relative">{s.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
