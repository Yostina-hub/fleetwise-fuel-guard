import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, WifiOff, CheckCircle, AlertTriangle, Signal, Zap } from "lucide-react";

interface DeviceQuickStatsProps {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  unassignedDevices: number;
  healthyDevices?: number;
}

const DeviceQuickStats = ({
  totalDevices,
  onlineDevices,
  offlineDevices,
  unassignedDevices,
  healthyDevices = 0,
}: DeviceQuickStatsProps) => {
  const onlineRate = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;
  
  const stats = [
    {
      label: "Total Devices",
      value: totalDevices.toString(),
      icon: Smartphone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Online",
      value: onlineDevices.toString(),
      icon: Signal,
      color: "text-success",
      bgColor: "bg-success/10",
      subtext: `${onlineRate}% connected`,
    },
    {
      label: "Offline",
      value: offlineDevices.toString(),
      icon: WifiOff,
      color: offlineDevices > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: offlineDevices > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Unassigned",
      value: unassignedDevices.toString(),
      icon: AlertTriangle,
      color: unassignedDevices > 0 ? "text-warning" : "text-success",
      bgColor: unassignedDevices > 0 ? "bg-warning/10" : "bg-success/10",
    },
    {
      label: "Healthy",
      value: healthyDevices.toString(),
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DeviceQuickStats;
