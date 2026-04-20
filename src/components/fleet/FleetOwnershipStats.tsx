import { Card, CardContent } from "@/components/ui/card";
import { Building2, Landmark, Handshake, KeyRound, Wrench, FileQuestion, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OwnershipCategory {
  /** Filter value matched against `vehicles.ownership_type` (lowercased). */
  key: string;
  label: string;
  description: string;
  icon: typeof Building2;
  /** Tailwind text color class for icon + count. */
  color: string;
  /** Tailwind background class for icon chip. */
  bg: string;
  /** Ring color when card is active. */
  ring: string;
}

/**
 * Centralised catalogue of ownership categories displayed as quick-stat cards.
 * Adding a new ownership model = adding one entry here.
 */
export const OWNERSHIP_CATEGORIES: OwnershipCategory[] = [
  {
    key: "owned",
    label: "Owned",
    description: "Company assets",
    icon: KeyRound,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/50",
  },
  {
    key: "commercial",
    label: "Commercial",
    description: "For-hire / commercial",
    icon: Building2,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/50",
  },
  {
    key: "government",
    label: "Government",
    description: "State / public sector",
    icon: Landmark,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    ring: "ring-indigo-500/50",
  },
  {
    key: "3pl",
    label: "3PL / Outsourced",
    description: "Third-party logistics",
    icon: Handshake,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/50",
  },
  {
    key: "leased",
    label: "Leased",
    description: "Long-term lease",
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/50",
  },
  {
    key: "rented",
    label: "Rented",
    description: "Short-term rental",
    icon: Wrench,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/50",
  },
  {
    key: "unspecified",
    label: "Unspecified",
    description: "Needs categorising",
    icon: FileQuestion,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    ring: "ring-muted-foreground/40",
  },
];

interface FleetOwnershipStatsProps {
  buckets: Record<string, number>;
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
}

/**
 * Compact, modern row of ownership-type cards. Each card is a toggle filter
 * for the vehicles table (mirrors the live-status quick stats above).
 */
export const FleetOwnershipStats = ({
  buckets,
  activeFilter = "all",
  onFilterChange,
}: FleetOwnershipStatsProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ownership Breakdown
        </h3>
        {activeFilter !== "all" && onFilterChange && (
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className="text-[11px] text-primary hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {OWNERSHIP_CATEGORIES.map((cat) => {
          const value = buckets[cat.key] ?? 0;
          const isActive = activeFilter === cat.key;
          const isClickable = !!onFilterChange;
          const Wrapper: any = isClickable ? "button" : "div";

          return (
            <Wrapper
              key={cat.key}
              type={isClickable ? "button" : undefined}
              onClick={isClickable ? () => onFilterChange!(isActive ? "all" : cat.key) : undefined}
              aria-pressed={isClickable ? isActive : undefined}
              className={cn(
                "text-left w-full",
                isClickable &&
                  "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg",
              )}
            >
              <Card
                className={cn(
                  "glass-strong transition-all duration-300",
                  isClickable && "hover:scale-[1.02] hover:shadow-lg",
                  isActive && `ring-2 ${cat.ring} shadow-md`,
                  value === 0 && !isActive && "opacity-60",
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("p-2 rounded-lg shrink-0", cat.bg)}>
                      <cat.icon className={cn("w-4 h-4", cat.color)} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xl font-bold leading-none", cat.color)}>{value}</p>
                      <p className="text-[11px] font-medium mt-1 truncate">{cat.label}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{cat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};

export default FleetOwnershipStats;
