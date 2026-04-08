import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Gauge, 
  Fuel, 
  Zap, 
  TrendingUp, 
  Shield, 
  Wifi,
  WifiOff,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetVitalsProps {
  vehicles: Array<{
    id: string;
    status: string;
    speed: number;
    fuel: number;
    deviceConnected?: boolean;
    ignitionOn?: boolean;
  }>;
  lastRefresh?: Date;
}

const FleetVitalsDashboard = ({ vehicles, lastRefresh }: FleetVitalsProps) => {
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const online = vehicles.filter(v => v.deviceConnected).length;
    const moving = vehicles.filter(v => v.status === 'moving').length;
    const idle = vehicles.filter(v => v.status === 'idle').length;
    const offline = vehicles.filter(v => !v.deviceConnected).length;
    const overspeed = vehicles.filter(v => v.speed > 80).length;
    
    const avgSpeed = vehicles.filter(v => v.speed > 0).length > 0
      ? Math.round(vehicles.filter(v => v.speed > 0).reduce((s, v) => s + v.speed, 0) / vehicles.filter(v => v.speed > 0).length)
      : 0;
    
    const avgFuel = vehicles.filter(v => v.fuel > 0).length > 0
      ? Math.round(vehicles.filter(v => v.fuel > 0).reduce((s, v) => s + v.fuel, 0) / vehicles.filter(v => v.fuel > 0).length)
      : 0;

    const utilization = total > 0 ? Math.round(((moving + idle) / total) * 100) : 0;
    
    // Fleet health score (0-100)
    const connectivityScore = total > 0 ? (online / total) * 30 : 0;
    const safetyScore = total > 0 ? ((total - overspeed) / total) * 30 : 0;
    const utilizationScore = utilization * 0.4;
    const healthScore = Math.round(connectivityScore + safetyScore + utilizationScore);

    return { total, online, moving, idle, offline, overspeed, avgSpeed, avgFuel, utilization, healthScore };
  }, [vehicles]);

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

  const vitals = [
    {
      label: "Fleet Health",
      value: `${metrics.healthScore}%`,
      icon: Shield,
      color: getHealthColor(metrics.healthScore),
      bg: getHealthBg(metrics.healthScore),
      sub: metrics.healthScore >= 80 ? "Excellent" : metrics.healthScore >= 60 ? "Good" : "Needs Attention",
    },
    {
      label: "Online",
      value: `${metrics.online}/${metrics.total}`,
      icon: Wifi,
      color: "text-green-500",
      bg: "from-green-500/20 to-green-500/5",
      sub: `${metrics.offline} offline`,
      alert: metrics.offline > 0,
    },
    {
      label: "Moving",
      value: metrics.moving.toString(),
      icon: Car,
      color: "text-blue-500",
      bg: "from-blue-500/20 to-blue-500/5",
      sub: `${metrics.idle} idle`,
    },
    {
      label: "Utilization",
      value: `${metrics.utilization}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "from-purple-500/20 to-purple-500/5",
      sub: "Active fleet",
    },
    {
      label: "Avg Speed",
      value: `${metrics.avgSpeed}`,
      icon: Gauge,
      color: "text-cyan-500",
      bg: "from-cyan-500/20 to-cyan-500/5",
      sub: "km/h",
    },
    {
      label: "Overspeed",
      value: metrics.overspeed.toString(),
      icon: Zap,
      color: metrics.overspeed > 0 ? "text-red-500" : "text-green-500",
      bg: metrics.overspeed > 0 ? "from-red-500/20 to-red-500/5" : "from-green-500/20 to-green-500/5",
      sub: metrics.overspeed > 0 ? "⚠ Violations" : "All clear",
      alert: metrics.overspeed > 0,
    },
    {
      label: "Avg Fuel",
      value: `${metrics.avgFuel}%`,
      icon: Fuel,
      color: metrics.avgFuel < 20 ? "text-red-500" : "text-emerald-500",
      bg: metrics.avgFuel < 20 ? "from-red-500/20 to-red-500/5" : "from-emerald-500/20 to-emerald-500/5",
      sub: metrics.avgFuel < 20 ? "Low fuel alert" : "Healthy",
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
        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">LIVE</span>
      </div>

      {vitals.map((vital, i) => (
        <motion.div
          key={vital.label}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 bg-gradient-to-r",
            vital.bg,
            vital.alert ? "border-red-500/30" : "border-border/50"
          )}
        >
          <vital.icon className={cn("w-4 h-4 shrink-0", vital.color)} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-sm font-bold", vital.color)}>{vital.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{vital.label}</span>
            </div>
            <span className="text-[9px] text-muted-foreground block leading-tight">{vital.sub}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FleetVitalsDashboard;
