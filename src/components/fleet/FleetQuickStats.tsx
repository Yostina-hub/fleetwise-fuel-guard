import { Card, CardContent } from "@/components/ui/card";
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
      label: "Total Fleet",
      value: totalVehicles.toString(),
      icon: Truck,
      color: "text-primary",
      bgColor: "bg-primary/10",
      ringColor: "ring-primary/40",
      subtext: "All vehicles",
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
      label: "Idle • Engine On",
      value: engineOnIdle.toString(),
      icon: Flame,
      color: "text-warning",
      bgColor: "bg-warning/10",
      ringColor: "ring-warning/50",
      subtext: "Burning fuel",
      pulse: engineOnIdle > 0,
      filter: "idle_engine_on",
    },
    {
      label: "Idle • Parked",
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
      subtext: avgFuelLevel > 30 ? "Healthy" : "Top up soon",
    },
  ];

  const ownedTotal = ownedVehicles + rentalVehicles;
  const ownedPct = ownedTotal > 0 ? Math.round((ownedVehicles / ownedTotal) * 100) : 0;
  const rentalPct = ownedTotal > 0 ? 100 - ownedPct : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
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
              "text-left w-full",
              isClickable &&
                "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg",
            )}
          >
            <Card
              className={cn(
                "glass-strong transition-all duration-300 h-full",
                isClickable && "hover:scale-[1.02] hover:shadow-lg",
                isActive && `ring-2 ${stat.ringColor} shadow-md`,
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className={`relative p-2 rounded-lg shrink-0 ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
                    {stat.pulse && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-warning"
                        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                        transition={{
                          duration: 1.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold leading-none">{stat.value}</p>
                    <p className="text-[11px] font-medium text-foreground/80 mt-1 leading-tight break-words">
                      {stat.label}
                    </p>
                    {stat.subtext && (
                      <p
                        className={`text-[10px] mt-0.5 ${stat.color} opacity-80 leading-tight break-words`}
                      >
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Wrapper>
        );
      })}

      {/* Owned vs Rental — split action card */}
      <Card className="glass-strong h-full overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="flex h-full divide-x divide-border/60">
            <button
              type="button"
              onClick={() => onOwnershipChange?.("owned")}
              aria-pressed={activeOwnership === "owned"}
              title={`Show ${ownedVehicles} owned vehicle${ownedVehicles === 1 ? "" : "s"}`}
              className={cn(
                "flex-1 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                onOwnershipChange && "cursor-pointer hover:bg-indigo-500/10",
                activeOwnership === "owned" && "bg-indigo-500/15",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="p-2 rounded-lg shrink-0 bg-indigo-500/10">
                  <Truck className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none text-indigo-500">
                    {ownedVehicles}
                  </p>
                  <p className="text-[11px] font-medium text-foreground/80 mt-1 leading-tight">
                    Owned
                  </p>
                  <p className="text-[10px] mt-0.5 text-indigo-500/80 leading-tight">
                    {ownedPct}% of fleet
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOwnershipChange?.("rental")}
              aria-pressed={activeOwnership === "rental"}
              title={`Show ${rentalVehicles} rental / outsourced vehicle${rentalVehicles === 1 ? "" : "s"}`}
              className={cn(
                "flex-1 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
                onOwnershipChange && "cursor-pointer hover:bg-amber-500/10",
                activeOwnership === "rental" && "bg-amber-500/15",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="p-2 rounded-lg shrink-0 bg-amber-500/10">
                  <Building2 className="w-4 h-4 text-amber-500" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none text-amber-500">
                    {rentalVehicles}
                  </p>
                  <p className="text-[11px] font-medium text-foreground/80 mt-1 leading-tight">
                    Rental
                  </p>
                  <p className="text-[10px] mt-0.5 text-amber-500/80 leading-tight">
                    {rentalPct}% outsourced
                  </p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetQuickStats;
