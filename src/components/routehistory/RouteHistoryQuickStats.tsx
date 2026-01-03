import { Card, CardContent } from "@/components/ui/card";
import { Route, Clock, Gauge, Fuel, MapPin, Timer } from "lucide-react";

interface RouteHistoryQuickStatsProps {
  totalDistance: string;
  duration: number;
  avgSpeed: string;
  maxSpeed: number;
  fuelConsumed: string;
  totalPoints: number;
}

const RouteHistoryQuickStats = ({
  totalDistance,
  duration,
  avgSpeed,
  maxSpeed,
  fuelConsumed,
  totalPoints,
}: RouteHistoryQuickStatsProps) => {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const stats = [
    {
      label: "Distance",
      value: `${totalDistance} km`,
      icon: Route,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Duration",
      value: formatDuration(duration),
      icon: Timer,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Avg Speed",
      value: `${avgSpeed} km/h`,
      icon: Gauge,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Max Speed",
      value: `${maxSpeed} km/h`,
      icon: Gauge,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Fuel Used",
      value: `${fuelConsumed}%`,
      icon: Fuel,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Data Points",
      value: totalPoints.toString(),
      icon: MapPin,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-muted/30 hover:scale-[1.02] transition-transform duration-300">
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

export default RouteHistoryQuickStats;
