import { Card, CardContent } from "@/components/ui/card";
import { Route, MapPin, Navigation, Percent } from "lucide-react";

interface RoutesQuickStatsProps {
  activeRoutes: number;
  customerSites: number;
  distanceCovered: number;
  optimizationRate: number;
}

const RoutesQuickStats = ({
  activeRoutes,
  customerSites,
  distanceCovered,
  optimizationRate
}: RoutesQuickStatsProps) => {
  const stats = [
    {
      label: "Active Routes",
      value: activeRoutes,
      icon: Route,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Customer Sites",
      value: customerSites,
      icon: MapPin,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Distance Covered",
      value: `${distanceCovered.toLocaleString()} km`,
      icon: Navigation,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      label: "Optimization Rate",
      value: `${optimizationRate}%`,
      icon: Percent,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
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

export default RoutesQuickStats;
