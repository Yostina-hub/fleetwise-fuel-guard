import { Card, CardContent } from "@/components/ui/card";
import { Truck, Navigation, Flame, ParkingSquare, WifiOff, Fuel } from "lucide-react";
import { motion } from "framer-motion";

interface FleetQuickStatsProps {
  totalVehicles: number;
  movingVehicles: number;
  idleVehicles: number;            // legacy (unused when split provided)
  offlineVehicles: number;
  inMaintenance?: number;
  avgFuelLevel?: number;
  idleEngineOnVehicles?: number;
  idleEngineOffVehicles?: number;
}

const FleetQuickStats = ({
  totalVehicles,
  movingVehicles,
  idleVehicles,
  offlineVehicles,
  inMaintenance = 0,
  avgFuelLevel = 0,
  idleEngineOnVehicles,
  idleEngineOffVehicles,
}: FleetQuickStatsProps) => {
  const utilizationRate = totalVehicles > 0 ? Math.round((movingVehicles / totalVehicles) * 100) : 0;

  // Fallback split if caller hasn't supplied the breakdown yet
  const engineOnIdle = idleEngineOnVehicles ?? 0;
  const engineOffIdle = idleEngineOffVehicles ?? Math.max(0, idleVehicles - engineOnIdle);

  const stats = [
    {
      label: "Total Fleet",
      value: totalVehicles.toString(),
      icon: Truck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Moving",
      value: movingVehicles.toString(),
      icon: Navigation,
      color: "text-success",
      bgColor: "bg-success/10",
      subtext: `${utilizationRate}% active`,
    },
    {
      label: "Idle • Engine On",
      value: engineOnIdle.toString(),
      icon: Flame,
      color: "text-warning",
      bgColor: "bg-warning/10",
      subtext: "Burning fuel",
      pulse: engineOnIdle > 0,
    },
    {
      label: "Idle • Engine Off",
      value: engineOffIdle.toString(),
      icon: ParkingSquare,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
      subtext: "Parked",
    },
    {
      label: "Offline",
      value: offlineVehicles.toString(),
      icon: WifiOff,
      color: offlineVehicles > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: offlineVehicles > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Avg Fuel",
      value: `${avgFuelLevel}%`,
      icon: Fuel,
      color: avgFuelLevel > 30 ? "text-emerald-600" : "text-warning",
      bgColor: avgFuelLevel > 30 ? "bg-emerald-500/10" : "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`relative p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                {stat.pulse && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-warning"
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                {stat.subtext && (
                  <p className={`text-[10px] mt-0.5 ${stat.color} opacity-80`}>{stat.subtext}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FleetQuickStats;
