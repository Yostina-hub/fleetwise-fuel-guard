import { cn } from "@/lib/utils";
import {
  Users, Link2, Unlink, Briefcase, Building2, Truck, Shield, UserCog, HelpCircle,
  Sparkles, TrendingUp, Check, Car,
} from "lucide-react";

type Filter = {
  driverType?: string;
  employmentType?: string;
  assignment?: "all" | "assigned" | "unassigned";
};

interface DriverCategoryCardsProps {
  total: number;
  assigned: number;
  unassigned: number;
  byDriverType: Record<string, number>;
  byEmploymentType: Record<string, number>;
  active: Filter;
  onSelect: (filter: Filter) => void;
}

type Tone = {
  label: string;
  icon: any;
  ring: string;       // ring color (hsl-friendly)
  glow: string;       // glow gradient
  iconBg: string;     // icon container
  iconText: string;   // icon color
  accent: string;     // accent line color
  text: string;       // value text color when active
};

const driverTypeMeta: Record<string, Tone> = {
  company: {
    label: "Company", icon: Building2,
    ring: "ring-cyan-400/40", glow: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    iconBg: "bg-cyan-500/10 border-cyan-500/30", iconText: "text-cyan-300",
    accent: "bg-cyan-400", text: "text-cyan-200",
  },
  ethio_contract: {
    label: "Ethio Contract", icon: Shield,
    ring: "ring-amber-400/40", glow: "from-amber-500/20 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10 border-amber-500/30", iconText: "text-amber-300",
    accent: "bg-amber-400", text: "text-amber-200",
  },
  outsource: {
    label: "Outsource", icon: UserCog,
    ring: "ring-fuchsia-400/40", glow: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent",
    iconBg: "bg-fuchsia-500/10 border-fuchsia-500/30", iconText: "text-fuchsia-300",
    accent: "bg-fuchsia-400", text: "text-fuchsia-200",
  },
  rental: {
    label: "Car Rental", icon: Car,
    ring: "ring-orange-400/40", glow: "from-orange-500/20 via-orange-500/5 to-transparent",
    iconBg: "bg-orange-500/10 border-orange-500/30", iconText: "text-orange-300",
    accent: "bg-orange-400", text: "text-orange-200",
  },
  third_party: {
    label: "Third Party (3PL)", icon: Truck,
    ring: "ring-indigo-400/40", glow: "from-indigo-500/20 via-indigo-500/5 to-transparent",
    iconBg: "bg-indigo-500/10 border-indigo-500/30", iconText: "text-indigo-300",
    accent: "bg-indigo-400", text: "text-indigo-200",
  },
  government: {
    label: "Government", icon: Briefcase,
    ring: "ring-emerald-400/40", glow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10 border-emerald-500/30", iconText: "text-emerald-300",
    accent: "bg-emerald-400", text: "text-emerald-200",
  },
  unspecified: {
    label: "Unspecified", icon: HelpCircle,
    ring: "ring-muted-foreground/30", glow: "from-muted/20 via-muted/5 to-transparent",
    iconBg: "bg-muted/30 border-border", iconText: "text-muted-foreground",
    accent: "bg-muted-foreground", text: "text-muted-foreground",
  },
};

const employmentTypeMeta: Record<string, { label: string; dot: string; ring: string; text: string }> = {
  permanent:   { label: "Permanent",   dot: "bg-primary",        ring: "ring-primary/40",        text: "text-primary" },
  regular:     { label: "Regular",     dot: "bg-cyan-400",       ring: "ring-cyan-400/40",       text: "text-cyan-300" },
  contract:    { label: "Contract",    dot: "bg-amber-400",      ring: "ring-amber-400/40",      text: "text-amber-300" },
  temporary:   { label: "Temporary",   dot: "bg-fuchsia-400",    ring: "ring-fuchsia-400/40",    text: "text-fuchsia-300" },
  intern:      { label: "Intern",      dot: "bg-muted-foreground", ring: "ring-muted-foreground/30", text: "text-muted-foreground" },
  unspecified: { label: "Unspecified", dot: "bg-muted-foreground", ring: "ring-muted-foreground/30", text: "text-muted-foreground" },
};

const formatLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* -------------------- Hero Stat Card (top row) -------------------- */
const HeroCard = ({
  active, onClick, icon: Icon, label, value, sub, tone, percent,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  value: number;
  sub?: string;
  tone: Tone;
  percent?: number;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "group relative isolate text-left overflow-hidden rounded-2xl",
      "border border-border/60 bg-card/40 backdrop-blur-xl",
      "p-5 transition-all duration-500 ease-out",
      "hover:-translate-y-1 hover:border-border hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]",
      active && cn("ring-2 ring-offset-2 ring-offset-background -translate-y-0.5 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.5)]", tone.ring),
    )}
  >
    {/* Ambient glow */}
    <div className={cn(
      "pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br opacity-60 transition-opacity duration-500 group-hover:opacity-100",
      tone.glow,
    )} />
    {/* Grid pattern overlay */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]"
      aria-hidden="true"
    />

    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn(
            "text-4xl font-bold tabular-nums tracking-tight transition-colors",
            active ? tone.text : "text-foreground",
          )}>
            {value.toLocaleString()}
          </span>
          {percent !== undefined && (
            <span className="text-xs font-medium text-foreground/80">{percent}%</span>
          )}
        </div>
        {sub && (
          <p className="mt-1.5 text-[11px] text-muted-foreground truncate">{sub}</p>
        )}
      </div>
      <div className={cn(
        "shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center",
        "transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
        tone.iconBg,
      )}>
        <Icon className={cn("w-5 h-5", tone.iconText)} aria-hidden="true" />
      </div>
    </div>

    {/* Progress bar for percent */}
    {percent !== undefined && (
      <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", tone.accent)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    )}

    {/* Active indicator */}
    {active && (
      <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))] animate-pulse" />
    )}

    {/* Bottom accent line */}
    <div className={cn(
      "absolute bottom-0 left-0 h-[2px] transition-all duration-500",
      tone.accent,
      active ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-60",
    )} />
  </button>
);

/* -------------------- Compact Type Card (driver types) -------------------- */
const TypeCard = ({
  active, onClick, icon: Icon, label, value, tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  value: number;
  tone: Tone;
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "group relative overflow-hidden rounded-xl text-left",
      "border border-border/60 bg-card/30 backdrop-blur-xl",
      "px-4 py-3 transition-all duration-300 min-w-[180px] flex-1 sm:flex-none sm:min-w-[200px]",
      "hover:border-border hover:bg-card/60 hover:-translate-y-0.5",
      active && cn("ring-2 ring-offset-1 ring-offset-background bg-card/70", tone.ring),
    )}
  >
    <div className={cn(
      "pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br opacity-50 transition-opacity duration-500 group-hover:opacity-90",
      tone.glow,
    )} />
    <div className="relative flex items-center gap-3">
      <div className={cn(
        "shrink-0 h-10 w-10 rounded-lg border flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
        tone.iconBg,
      )}>
        <Icon className={cn("w-4.5 h-4.5", tone.iconText)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        <p className={cn(
          "text-2xl font-bold tabular-nums leading-tight mt-0.5 transition-colors",
          active ? tone.text : "text-foreground",
        )}>
          {value}
        </p>
      </div>
      {active && (
        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tone.accent)} />
      )}
    </div>
  </button>
);

/* -------------------- Section Heading -------------------- */
const SectionHeading = ({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
      <Icon className="w-3 h-3 text-primary" aria-hidden="true" />
    </div>
    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/90">
      {title}
    </h3>
    {hint && (
      <span className="text-[10px] text-muted-foreground ml-1">{hint}</span>
    )}
    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent ml-2" />
  </div>
);

/* -------------------- Main Component -------------------- */
const DriverCategoryCards = ({
  total, assigned, unassigned, byDriverType, byEmploymentType, active, onSelect,
}: DriverCategoryCardsProps) => {
  const isAllActive = !active.driverType && !active.employmentType && (!active.assignment || active.assignment === "all");

  const driverTypeEntries = Object.entries(byDriverType).sort((a, b) => b[1] - a[1]);
  const employmentEntries = Object.entries(byEmploymentType).sort((a, b) => b[1] - a[1]);

  const assignedPct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  const unassignedPct = total > 0 ? Math.round((unassigned / total) * 100) : 0;

  const allTone: Tone = {
    label: "All", icon: Users,
    ring: "ring-primary/50", glow: "from-primary/20 via-primary/5 to-transparent",
    iconBg: "bg-primary/10 border-primary/30", iconText: "text-primary",
    accent: "bg-primary", text: "text-primary",
  };
  const assignedTone: Tone = {
    label: "Assigned", icon: Link2,
    ring: "ring-emerald-400/50", glow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10 border-emerald-500/30", iconText: "text-emerald-300",
    accent: "bg-emerald-400", text: "text-emerald-200",
  };
  const unassignedTone: Tone = {
    label: "Unassigned", icon: Unlink,
    ring: "ring-orange-400/50", glow: "from-orange-500/20 via-orange-500/5 to-transparent",
    iconBg: "bg-orange-500/10 border-orange-500/30", iconText: "text-orange-300",
    accent: "bg-orange-400", text: "text-orange-200",
  };

  return (
    <section className="space-y-4" aria-label="Driver categories">
      {/* Primary row: Total / Assigned / Unassigned */}
      <div>
        <SectionHeading icon={Sparkles} title="Assignment Overview" hint="Click any card to filter" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HeroCard
            active={isAllActive}
            onClick={() => onSelect({ assignment: "all" })}
            icon={allTone.icon}
            label="All Drivers"
            value={total}
            sub={isAllActive ? "Showing entire workforce" : "Click to clear filters"}
            tone={allTone}
          />
          <HeroCard
            active={active.assignment === "assigned"}
            onClick={() => onSelect({ assignment: "assigned" })}
            icon={assignedTone.icon}
            label="Assigned to Vehicle"
            value={assigned}
            sub={`${assignedPct}% of fleet currently assigned`}
            tone={assignedTone}
            percent={assignedPct}
          />
          <HeroCard
            active={active.assignment === "unassigned"}
            onClick={() => onSelect({ assignment: "unassigned" })}
            icon={unassignedTone.icon}
            label="Unassigned"
            value={unassigned}
            sub={unassigned > 0 ? `${unassignedPct}% available to assign` : "All drivers placed"}
            tone={unassignedTone}
            percent={unassignedPct}
          />
        </div>
      </div>

      {/* Driver Type row */}
      {driverTypeEntries.length > 0 && (
        <div>
          <SectionHeading icon={TrendingUp} title="By Driver Type" />
          <div className="flex flex-wrap gap-3">
            {driverTypeEntries.map(([key, count]) => {
              const meta = driverTypeMeta[key] || {
                ...driverTypeMeta.unspecified,
                label: formatLabel(key),
              };
              return (
                <TypeCard
                  key={key}
                  active={active.driverType === key}
                  onClick={() => onSelect({ driverType: key })}
                  icon={meta.icon}
                  label={meta.label}
                  value={count}
                  tone={meta}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Employment Type chips */}
      {employmentEntries.length > 0 && (
        <div>
          <SectionHeading icon={Check} title="By Employment" />
          <div className="flex flex-wrap gap-2">
            {employmentEntries.map(([key, count]) => {
              const meta = employmentTypeMeta[key] || {
                label: formatLabel(key),
                dot: "bg-muted-foreground",
                ring: "ring-muted-foreground/30",
                text: "text-muted-foreground",
              };
              const isActive = active.employmentType === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelect({ employmentType: key })}
                  aria-pressed={isActive}
                  className={cn(
                    "group inline-flex items-center gap-2 px-3.5 py-2 rounded-full",
                    "border border-border/60 bg-card/40 backdrop-blur-xl",
                    "text-xs font-medium transition-all duration-300",
                    "hover:border-border hover:bg-card/70 hover:-translate-y-0.5",
                    isActive && cn("ring-2 ring-offset-1 ring-offset-background bg-card/80", meta.ring),
                  )}
                >
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-125",
                    meta.dot,
                    isActive && "animate-pulse",
                  )} />
                  <span className={cn("transition-colors", isActive ? meta.text : "text-foreground/90")}>
                    {meta.label}
                  </span>
                  <span className={cn(
                    "tabular-nums font-bold px-1.5 py-0.5 rounded-md text-[11px]",
                    "bg-background/60 border border-border/40",
                    isActive && meta.text,
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default DriverCategoryCards;
