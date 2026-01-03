import { Card, CardContent } from "@/components/ui/card";
import { Truck, Navigation, Clock, WifiOff, Wrench, Fuel } from "lucide-react";

interface FleetQuickStatsProps {
  totalVehicles: number;
  movingVehicles: number;
  idleVehicles: number;
  offlineVehicles: number;
  inMaintenance?: number;
  avgFuelLevel?: number;
}

const FleetQuickStats = ({
  totalVehicles,
  movingVehicles,
  idleVehicles,
  offlineVehicles,
  inMaintenance = 0,
  avgFuelLevel = 0,
}: FleetQuickStatsProps) => {
  const utilizationRate = totalVehicles > 0 ? Math.round((movingVehicles / totalVehicles) * 100) : 0;
  
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
      label: "Maintenance",
      value: inMaintenance.toString(),
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
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

export default FleetQuickStats;
