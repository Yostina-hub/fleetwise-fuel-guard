import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Users, Link2, Unlink, Briefcase, Building2, Truck, Shield, UserCog, HelpCircle,
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

const driverTypeMeta: Record<string, { label: string; icon: any; tone: string }> = {
  company: { label: "Company", icon: Building2, tone: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30 text-cyan-400" },
  ethio_contract: { label: "Ethio Contract", icon: Shield, tone: "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-400" },
  outsource: { label: "Outsource", icon: UserCog, tone: "from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/30 text-fuchsia-400" },
  third_party: { label: "Third Party (3PL)", icon: Truck, tone: "from-indigo-500/15 to-indigo-500/5 border-indigo-500/30 text-indigo-400" },
  government: { label: "Government", icon: Briefcase, tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-400" },
  unspecified: { label: "Unspecified Type", icon: HelpCircle, tone: "from-muted/30 to-muted/10 border-border text-muted-foreground" },
};

const employmentTypeMeta: Record<string, { label: string; tone: string }> = {
  permanent: { label: "Permanent", tone: "border-primary/30 text-primary" },
  regular: { label: "Regular", tone: "border-cyan-500/30 text-cyan-400" },
  contract: { label: "Contract", tone: "border-amber-500/30 text-amber-400" },
  temporary: { label: "Temporary", tone: "border-fuchsia-500/30 text-fuchsia-400" },
  intern: { label: "Intern", tone: "border-muted text-muted-foreground" },
  unspecified: { label: "Unspecified", tone: "border-muted text-muted-foreground" },
};

const formatLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const StatCard = ({
  active, onClick, icon: Icon, label, value, tone, sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  value: number;
  tone: string;
  sub?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative text-left overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all duration-300",
      "hover:scale-[1.03] hover:shadow-lg",
      tone,
      active && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80 truncate">{label}</p>
        <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
      <div className="p-2 rounded-lg bg-background/40 backdrop-blur-sm">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
    </div>
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
    )}
  </button>
);

const DriverCategoryCards = ({
  total, assigned, unassigned, byDriverType, byEmploymentType, active, onSelect,
}: DriverCategoryCardsProps) => {
  const isAllActive = !active.driverType && !active.employmentType && (!active.assignment || active.assignment === "all");

  const driverTypeEntries = Object.entries(byDriverType).sort((a, b) => b[1] - a[1]);
  const employmentEntries = Object.entries(byEmploymentType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Primary row: Total / Assigned / Unassigned */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assignment Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            active={isAllActive}
            onClick={() => onSelect({ assignment: "all" })}
            icon={Users}
            label="All Drivers"
            value={total}
            tone="from-primary/15 to-primary/5 border-primary/30 text-primary"
            sub="Click to clear filters"
          />
          <StatCard
            active={active.assignment === "assigned"}
            onClick={() => onSelect({ assignment: "assigned" })}
            icon={Link2}
            label="Assigned to Vehicle"
            value={assigned}
            tone="from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-400"
            sub={`${total > 0 ? Math.round((assigned / total) * 100) : 0}% of fleet`}
          />
          <StatCard
            active={active.assignment === "unassigned"}
            onClick={() => onSelect({ assignment: "unassigned" })}
            icon={Unlink}
            label="Unassigned"
            value={unassigned}
            tone="from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-400"
            sub={unassigned > 0 ? "Available to assign" : "All drivers placed"}
          />
        </div>
      </div>

      {/* Driver Type row */}
      {driverTypeEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">By Driver Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {driverTypeEntries.map(([key, count]) => {
              const meta = driverTypeMeta[key] || { label: formatLabel(key), icon: Users, tone: "from-muted/20 to-muted/5 border-border text-muted-foreground" };
              return (
                <StatCard
                  key={key}
                  active={active.driverType === key}
                  onClick={() => onSelect({ driverType: key })}
                  icon={meta.icon}
                  label={meta.label}
                  value={count}
                  tone={`bg-gradient-to-br ${meta.tone}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Employment Type chips */}
      {employmentEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">By Employment</h3>
          <div className="flex flex-wrap gap-2">
            {employmentEntries.map(([key, count]) => {
              const meta = employmentTypeMeta[key] || { label: formatLabel(key), tone: "border-muted text-muted-foreground" };
              const isActive = active.employmentType === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelect({ employmentType: key })}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105",
                    meta.tone,
                    isActive ? "ring-2 ring-primary bg-primary/10" : "bg-background/50"
                  )}
                >
                  {meta.label} <span className="font-bold ml-1">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverCategoryCards;
