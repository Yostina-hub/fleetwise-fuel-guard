import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Fuel,
  Zap,
  TrendingUp,
  Shield,
  Wifi,
  Car,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FleetVitalKey =
  | "health"
  | "online"
  | "moving"
  | "utilization"
  | "speed"
  | "overspeed"
  | "fuel"
  | "fleet_mix";

interface FleetVitalsProps {
  vehicles: Array<{
    id: string;
    status: string;
    speed: number;
    fuel: number;
    deviceConnected?: boolean;
    ignitionOn?: boolean;
    ownershipType?: string;
  }>;
  lastRefresh?: Date;
  ownedCount?: number;
  rentalCount?: number;
  /** Called when a vital card is clicked. Receives a key identifying the card. */
  onCardClick?: (key: FleetVitalKey) => void;
  /** Optional secondary handler invoked specifically for the Fleet Mix card halves. */
  onFleetMixClick?: (segment: "owned" | "rental") => void;
}

const FleetVitalsDashboard = ({
  vehicles,
  ownedCount,
  rentalCount,
  onCardClick,
  onFleetMixClick,
}: FleetVitalsProps) => {
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const online = vehicles.filter((v) => v.deviceConnected).length;
    const moving = vehicles.filter((v) => v.status === "moving").length;
    const idle = vehicles.filter((v) => v.status === "idle").length;
    const offline = vehicles.filter((v) => !v.deviceConnected).length;
    const overspeed = vehicles.filter((v) => v.speed > 80).length;

    const movingVehicles = vehicles.filter((v) => v.speed > 0);
    const avgSpeed = movingVehicles.length > 0
      ? Math.round(movingVehicles.reduce((s, v) => s + v.speed, 0) / movingVehicles.length)
      : 0;

    const fueledVehicles = vehicles.filter((v) => v.fuel > 0);
    const avgFuel = fueledVehicles.length > 0
      ? Math.round(fueledVehicles.reduce((s, v) => s + v.fuel, 0) / fueledVehicles.length)
      : 0;

    const utilization = total > 0 ? Math.round(((moving + idle) / total) * 100) : 0;

    const connectivityScore = total > 0 ? (online / total) * 30 : 0;
    const safetyScore = total > 0 ? ((total - overspeed) / total) * 30 : 0;
    const utilizationScore = utilization * 0.4;
    const healthScore = Math.round(connectivityScore + safetyScore + utilizationScore);

    // Owned vs Rental — prefer explicit props, otherwise derive from vehicles
    const owned =
      ownedCount ??
      vehicles.filter(
        (v) => !v.ownershipType || v.ownershipType.toLowerCase() === "owned",
      ).length;
    const rental =
      rentalCount ??
      vehicles.filter((v) => v.ownershipType && v.ownershipType.toLowerCase() !== "owned")
        .length;

    return {
      total,
      online,
      moving,
      idle,
      offline,
      overspeed,
      avgSpeed,
      avgFuel,
      utilization,
      healthScore,
      owned,
      rental,
    };
  }, [vehicles, ownedCount, rentalCount]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-500/5";
    if (score >= 60) return "from-yellow-500/20 to-yellow-500/5";
    if (score >= 40) return "from-orange-500/20 to-orange-500/5";
    return "from-red-500/20 to-red-500/5";
  };

  const vitals: Array<{
    key: FleetVitalKey;
    label: string;
    value: string;
    icon: typeof Shield;
    color: string;
    bg: string;
    sub: string;
    alert?: boolean;
    title: string;
  }> = [
    {
      key: "health",
      label: "Fleet Health",
      value: `${metrics.healthScore}%`,
      icon: Shield,
      color: getHealthColor(metrics.healthScore),
      bg: getHealthBg(metrics.healthScore),
      sub:
        metrics.healthScore >= 80
          ? "Excellent"
          : metrics.healthScore >= 60
            ? "Good"
            : "Needs Attention",
      title: "View overall fleet health",
    },
    {
      key: "online",
      label: "Online",
      value: `${metrics.online}/${metrics.total}`,
      icon: Wifi,
      color: "text-green-500",
      bg: "from-green-500/20 to-green-500/5",
      sub: `${metrics.offline} offline`,
      alert: metrics.offline > 0,
      title: "Show offline / unreachable vehicles",
    },
    {
      key: "moving",
      label: "Moving",
      value: metrics.moving.toString(),
      icon: Car,
      color: "text-blue-500",
      bg: "from-blue-500/20 to-blue-500/5",
      sub: `${metrics.idle} idle`,
      title: "Show vehicles currently moving",
    },
    {
      key: "utilization",
      label: "Utilization",
      value: `${metrics.utilization}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "from-purple-500/20 to-purple-500/5",
      sub: "Active fleet",
      title: "Show active vehicles (moving + idle)",
    },
    {
      key: "speed",
      label: "Avg Speed",
      value: `${metrics.avgSpeed}`,
      icon: Gauge,
      color: "text-cyan-500",
      bg: "from-cyan-500/20 to-cyan-500/5",
      sub: "km/h",
      title: "Show vehicles currently moving",
    },
    {
      key: "overspeed",
      label: "Overspeed",
      value: metrics.overspeed.toString(),
      icon: Zap,
      color: metrics.overspeed > 0 ? "text-red-500" : "text-green-500",
      bg:
        metrics.overspeed > 0
          ? "from-red-500/20 to-red-500/5"
          : "from-green-500/20 to-green-500/5",
      sub: metrics.overspeed > 0 ? "⚠ Violations" : "All clear",
      alert: metrics.overspeed > 0,
      title: "Show overspeeding vehicles",
    },
    {
      key: "fuel",
      label: "Avg Fuel",
      value: `${metrics.avgFuel}%`,
      icon: Fuel,
      color: metrics.avgFuel < 20 ? "text-red-500" : "text-emerald-500",
      bg:
        metrics.avgFuel < 20
          ? "from-red-500/20 to-red-500/5"
          : "from-emerald-500/20 to-emerald-500/5",
      sub: metrics.avgFuel < 20 ? "Low fuel alert" : "Healthy",
      title: "Filter low-fuel vehicles",
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* Live Heartbeat */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 shrink-0">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full bg-green-500"
        />
        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
          LIVE
        </span>
      </div>

      {vitals.map((vital, i) => {
        const clickable = !!onCardClick;
        return (
          <motion.button
            type="button"
            key={vital.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={clickable ? { y: -2 } : undefined}
            whileTap={clickable ? { scale: 0.97 } : undefined}
            onClick={clickable ? () => onCardClick?.(vital.key) : undefined}
            disabled={!clickable}
            title={clickable ? vital.title : vital.label}
            aria-label={`${vital.label}: ${vital.value}. ${vital.title}`}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 bg-gradient-to-r text-left",
              vital.bg,
              vital.alert ? "border-red-500/30" : "border-border/50",
              clickable
                ? "cursor-pointer transition-all hover:border-primary/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                : "cursor-default",
            )}
          >
            <vital.icon className={cn("w-4 h-4 shrink-0", vital.color)} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-sm font-bold", vital.color)}>{vital.value}</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {vital.label}
                </span>
              </div>
              <span className="text-[9px] text-muted-foreground block leading-tight">
                {vital.sub}
              </span>
            </div>
          </motion.button>
        );
      })}

      {/* Owned vs Rental — split card with two action segments */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: vitals.length * 0.05 }}
        className="flex items-stretch rounded-lg border border-border/50 overflow-hidden shrink-0 bg-gradient-to-r from-indigo-500/15 to-amber-500/10"
      >
        <button
          type="button"
          onClick={() => onFleetMixClick?.("owned")}
          title="View owned fleet"
          aria-label={`Owned vehicles: ${metrics.owned}`}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-left transition-all",
            onFleetMixClick
              ? "cursor-pointer hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              : "cursor-default",
          )}
        >
          <Car className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-indigo-500">{metrics.owned}</span>
              <span className="text-[10px] text-muted-foreground font-medium">Owned</span>
            </div>
            <span className="text-[9px] text-muted-foreground block leading-tight">
              Company fleet
            </span>
          </div>
        </button>
        <div className="w-px bg-border/60" aria-hidden />
        <button
          type="button"
          onClick={() => onFleetMixClick?.("rental")}
          title="Open rental & outsourced vehicles"
          aria-label={`Rental vehicles: ${metrics.rental}`}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-left transition-all",
            onFleetMixClick
              ? "cursor-pointer hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              : "cursor-default",
          )}
        >
          <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-amber-500">{metrics.rental}</span>
              <span className="text-[10px] text-muted-foreground font-medium">Rental</span>
            </div>
            <span className="text-[9px] text-muted-foreground block leading-tight">
              Outsourced fleet
            </span>
          </div>
        </button>
      </motion.div>
    </div>
  );
};

export default FleetVitalsDashboard;
