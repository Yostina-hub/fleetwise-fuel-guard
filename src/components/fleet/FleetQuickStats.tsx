import {
  Truck,
  Navigation,
  Flame,
  ParkingSquare,
  WifiOff,
  Fuel,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type LiveStatusFilter = "all" | "moving" | "idle_engine_on" | "idle_engine_off" | "offline";
type OwnershipSegment = "owned" | "rental";

interface FleetQuickStatsProps {
  totalVehicles: number;
  movingVehicles: number;
  idleVehicles: number; // legacy (unused when split provided)
  offlineVehicles: number;
  inMaintenance?: number;
  avgFuelLevel?: number;
  idleEngineOnVehicles?: number;
  idleEngineOffVehicles?: number;
  ownedVehicles?: number;
  rentalVehicles?: number;
  activeFilter?: string;
  activeOwnership?: string;
  onFilterChange?: (filter: LiveStatusFilter) => void;
  onOwnershipChange?: (segment: OwnershipSegment) => void;
}

const FleetQuickStats = ({
  totalVehicles,
  movingVehicles,
  idleVehicles,
  offlineVehicles,
  avgFuelLevel = 0,
  idleEngineOnVehicles,
  idleEngineOffVehicles,
  ownedVehicles = 0,
  rentalVehicles = 0,
  activeFilter = "all",
  activeOwnership = "all",
  onFilterChange,
  onOwnershipChange,
}: FleetQuickStatsProps) => {
  const utilizationRate =
    totalVehicles > 0 ? Math.round((movingVehicles / totalVehicles) * 100) : 0;

  const engineOnIdle = idleEngineOnVehicles ?? 0;
  const engineOffIdle = idleEngineOffVehicles ?? Math.max(0, idleVehicles - engineOnIdle);

  const ownedTotal = ownedVehicles + rentalVehicles;
  const ownedPct = ownedTotal > 0 ? Math.round((ownedVehicles / ownedTotal) * 100) : 0;
  const rentalPct = ownedTotal > 0 ? 100 - ownedPct : 0;

  const stats: Array<{
    label: string;
    value: string;
    icon: typeof Truck;
    color: string;
    bgColor: string;
    ringColor: string;
    subtext?: string;
    pulse?: boolean;
    filter?: LiveStatusFilter;
  }> = [
    {
      label: "Total",
      value: totalVehicles.toString(),
      icon: Truck,
      color: "text-primary",
      bgColor: "bg-primary/10",
      ringColor: "ring-primary/40",
      subtext: "Fleet",
      filter: "all",
    },
    {
      label: "Moving",
      value: movingVehicles.toString(),
      icon: Navigation,
      color: "text-success",
      bgColor: "bg-success/10",
      ringColor: "ring-success/50",
      subtext: `${utilizationRate}% active`,
      filter: "moving",
    },
    {
      label: "Engine On",
      value: engineOnIdle.toString(),
      icon: Flame,
      color: "text-warning",
      bgColor: "bg-warning/10",
      ringColor: "ring-warning/50",
      subtext: "Idling",
      pulse: engineOnIdle > 0,
      filter: "idle_engine_on",
    },
    {
      label: "Parked",
      value: engineOffIdle.toString(),
      icon: ParkingSquare,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
      ringColor: "ring-sky-500/50",
      subtext: "Engine off",
      filter: "idle_engine_off",
    },
    {
      label: "Offline",
      value: offlineVehicles.toString(),
      icon: WifiOff,
      color: offlineVehicles > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: offlineVehicles > 0 ? "bg-destructive/10" : "bg-muted/50",
      ringColor: "ring-destructive/50",
      subtext: "No signal",
      filter: "offline",
    },
    {
      label: "Avg Fuel",
      value: `${avgFuelLevel}%`,
      icon: Fuel,
      color: avgFuelLevel > 30 ? "text-emerald-600" : "text-warning",
      bgColor: avgFuelLevel > 30 ? "bg-emerald-500/10" : "bg-warning/10",
      ringColor: "ring-emerald-500/40",
      subtext: avgFuelLevel > 30 ? "Healthy" : "Top up",
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 glass-strong overflow-hidden">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y lg:divide-y-0 divide-border/40">
        {stats.map((stat) => {
          const isClickable = !!stat.filter && !!onFilterChange;
          const isActive =
            isClickable && activeFilter === stat.filter && stat.filter !== "all";
          const Wrapper: any = isClickable ? "button" : "div";

          return (
            <Wrapper
              key={stat.label}
              type={isClickable ? "button" : undefined}
              onClick={isClickable ? () => onFilterChange!(stat.filter!) : undefined}
              aria-pressed={isClickable ? isActive : undefined}
              title={isClickable ? `Filter: ${stat.label}` : stat.label}
              className={cn(
                "relative text-left w-full px-3 py-3 transition-all min-w-0",
                "focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60",
                isClickable && "cursor-pointer hover:bg-foreground/[0.03]",
                isActive && "bg-foreground/[0.04]",
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 top-0 h-0.5",
                    stat.color.replace("text-", "bg-"),
                  )}
                />
              )}
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <div className={`relative p-1 rounded shrink-0 ${stat.bgColor}`}>
                  <stat.icon className={`w-3 h-3 ${stat.color}`} aria-hidden="true" />
                  {stat.pulse && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-warning"
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none truncate">
                  {stat.label}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <p className="text-2xl font-bold leading-none tabular-nums tracking-tight">
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-[10px] text-muted-foreground leading-none truncate">
                    {stat.subtext}
                  </p>
                )}
              </div>
            </Wrapper>
          );
        })}

        {/* Owned segment */}
        <button
          type="button"
          onClick={() => onOwnershipChange?.("owned")}
          aria-pressed={activeOwnership === "owned"}
          title={`${ownedVehicles} owned vehicle${ownedVehicles === 1 ? "" : "s"}`}
          className={cn(
            "relative text-left w-full px-3 py-3 transition-all min-w-0",
            "focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/60",
            onOwnershipChange && "cursor-pointer hover:bg-foreground/[0.03]",
            activeOwnership === "owned" && "bg-foreground/[0.04]",
          )}
        >
          {activeOwnership === "owned" && (
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-indigo-500" />
          )}
          <div className="flex items-center gap-2 mb-1.5 min-w-0">
            <div className="p-1 rounded shrink-0 bg-indigo-500/10">
              <Truck className="w-3 h-3 text-indigo-500" aria-hidden="true" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none truncate">
              Owned
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <p className="text-2xl font-bold leading-none text-indigo-500 tabular-nums tracking-tight">
              {ownedVehicles}
            </p>
            <p className="text-[10px] text-muted-foreground leading-none truncate">
              {ownedPct}%
            </p>
          </div>
        </button>

        {/* Rental segment */}
        <button
          type="button"
          onClick={() => onOwnershipChange?.("rental")}
          aria-pressed={activeOwnership === "rental"}
          title={`${rentalVehicles} rental vehicle${rentalVehicles === 1 ? "" : "s"}`}
          className={cn(
            "relative text-left w-full px-3 py-3 transition-all min-w-0",
            "focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60",
            onOwnershipChange && "cursor-pointer hover:bg-foreground/[0.03]",
            activeOwnership === "rental" && "bg-foreground/[0.04]",
          )}
        >
          {activeOwnership === "rental" && (
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
          )}
          <div className="flex items-center gap-2 mb-1.5 min-w-0">
            <div className="p-1 rounded shrink-0 bg-amber-500/10">
              <Building2 className="w-3 h-3 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none truncate">
              Rental
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <p className="text-2xl font-bold leading-none text-amber-500 tabular-nums tracking-tight">
              {rentalVehicles}
            </p>
            <p className="text-[10px] text-muted-foreground leading-none truncate">
              {rentalPct}%
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default FleetQuickStats;
