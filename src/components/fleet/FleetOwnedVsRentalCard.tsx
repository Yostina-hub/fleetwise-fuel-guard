import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetOwnedVsRentalCardProps {
  /** Bucket counts keyed by `vehicles.ownership_type` (lowercased). */
  buckets: Record<string, number>;
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
}

/**
 * Single composite card giving an at-a-glance "Owned vs Rental" summary.
 *
 * - "Owned" = `ownership_type = 'owned'`.
 * - "Rental" = combined count of `'rented'` + `'leased'` (any non-owned tenure).
 * - Click either side to filter the vehicles list. Click the active side again to clear.
 */
const FleetOwnedVsRentalCard = ({
  buckets,
  activeFilter = "all",
  onFilterChange,
}: FleetOwnedVsRentalCardProps) => {
  const owned = buckets.owned ?? 0;
  const rented = buckets.rented ?? 0;
  const leased = buckets.leased ?? 0;
  const rental = rented + leased;
  const total = owned + rental;

  const ownedPct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const rentalPct = total > 0 ? 100 - ownedPct : 0;

  const isOwnedActive = activeFilter === "owned";
  // Treat either rental sub-type filter as "rental side active"
  const isRentalActive = activeFilter === "rented" || activeFilter === "leased";

  const handleOwned = () => onFilterChange?.(isOwnedActive ? "all" : "owned");
  // Default rental click filters to the bigger sub-bucket so the user sees results
  const handleRental = () => {
    if (!onFilterChange) return;
    if (isRentalActive) return onFilterChange("all");
    const target = rented >= leased ? "rented" : "leased";
    onFilterChange(target);
  };

  const Side = ({
    label,
    value,
    pct,
    icon: Icon,
    active,
    onClick,
    accent,
    glow,
    iconBg,
    iconText,
    barColor,
    align = "left",
  }: {
    label: string;
    value: number;
    pct: number;
    icon: typeof KeyRound;
    active: boolean;
    onClick: () => void;
    accent: string;
    glow: string;
    iconBg: string;
    iconText: string;
    barColor: string;
    align?: "left" | "right";
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex-1 overflow-hidden rounded-xl text-left",
        "border border-border/60 bg-card/40 backdrop-blur-xl",
        "p-4 sm:p-5 transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.4)]",
        active && cn("ring-2 ring-offset-2 ring-offset-background", accent),
        align === "right" && "text-right",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-16 h-40 w-40 rounded-full blur-3xl bg-gradient-to-br opacity-60 transition-opacity duration-500 group-hover:opacity-100",
          align === "right" ? "-left-16" : "-right-16",
          glow,
        )}
      />
      <div
        className={cn(
          "relative flex items-start gap-3",
          align === "right" && "flex-row-reverse",
        )}
      >
        <div
          className={cn(
            "shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center",
            "transition-transform duration-300 group-hover:scale-110",
            iconBg,
          )}
        >
          <Icon className={cn("w-5 h-5", iconText)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "mt-1 flex items-baseline gap-2",
              align === "right" && "justify-end",
            )}
          >
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {value.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
          </div>
        </div>
      </div>
      {/* Bottom progress bar reflecting share of total */}
      <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </button>
  );

  return (
    <Card className="glass-strong border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/90">
            Owned vs Rental
          </h3>
          <span className="text-[10px] text-muted-foreground ml-1">
            {total.toLocaleString()} categorised vehicle{total === 1 ? "" : "s"}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent ml-2" />
          {(isOwnedActive || isRentalActive) && onFilterChange && (
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className="text-[11px] text-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Side
            label="Owned"
            value={owned}
            pct={ownedPct}
            icon={KeyRound}
            active={isOwnedActive}
            onClick={handleOwned}
            accent="ring-emerald-500/50"
            glow="from-emerald-500/20 via-emerald-500/5 to-transparent"
            iconBg="bg-emerald-500/10 border-emerald-500/30"
            iconText="text-emerald-400"
            barColor="bg-emerald-500"
          />
          <Side
            label="Rental"
            value={rental}
            pct={rentalPct}
            icon={Wrench}
            active={isRentalActive}
            onClick={handleRental}
            accent="ring-rose-500/50"
            glow="from-rose-500/20 via-rose-500/5 to-transparent"
            iconBg="bg-rose-500/10 border-rose-500/30"
            iconText="text-rose-400"
            barColor="bg-rose-500"
            align="right"
          />
        </div>

        {/* Combined split bar visualising share */}
        {total > 0 && (
          <div
            className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-muted/30"
            role="img"
            aria-label={`Owned ${ownedPct}%, Rental ${rentalPct}%`}
          >
            <div
              className="h-full bg-success transition-all duration-700"
              style={{ width: `${ownedPct}%` }}
            />
            <div
              className="h-full bg-destructive transition-all duration-700"
              style={{ width: `${rentalPct}%` }}
            />
          </div>
        )}

        {rental > 0 && (rented > 0 || leased > 0) && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Rental includes{" "}
            <span className="text-foreground/80 font-medium">{rented.toLocaleString()} rented</span>
            {" + "}
            <span className="text-foreground/80 font-medium">{leased.toLocaleString()} leased</span>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FleetOwnedVsRentalCard;
