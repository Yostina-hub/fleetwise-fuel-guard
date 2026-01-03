import { Card, CardContent } from "@/components/ui/card";
import { Navigation, Clock, WifiOff, AlertTriangle, Gauge, MapPin } from "lucide-react";

interface MapQuickStatsProps {
  totalVehicles: number;
  movingVehicles: number;
  idleVehicles: number;
  offlineVehicles: number;
  avgSpeed?: number;
  activeAlerts?: number;
}

const MapQuickStats = ({
  totalVehicles,
  movingVehicles,
  idleVehicles,
  offlineVehicles,
  avgSpeed = 0,
  activeAlerts = 0,
}: MapQuickStatsProps) => {
  const stats = [
    {
      label: "On Map",
      value: totalVehicles.toString(),
      icon: MapPin,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Moving",
      value: movingVehicles.toString(),
      icon: Navigation,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Idle",
      value: idleVehicles.toString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Offline",
      value: offlineVehicles.toString(),
      icon: WifiOff,
      color: offlineVehicles > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: offlineVehicles > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Avg Speed",
      value: `${Math.round(avgSpeed)} km/h`,
      icon: Gauge,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Alerts",
      value: activeAlerts.toString(),
      icon: AlertTriangle,
      color: activeAlerts > 0 ? "text-destructive" : "text-success",
      bgColor: activeAlerts > 0 ? "bg-destructive/10" : "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-background/95 backdrop-blur-sm hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MapQuickStats;
