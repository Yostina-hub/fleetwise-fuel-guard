import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Car, Activity, Award, Clock } from "lucide-react";

interface DriverQuickStatsProps {
  vehiclePlate?: string | null;
  vehicleMakeModel?: string | null;
  totalTrips: number;
  totalDistanceKm: number;
  safetyScore?: number | null;
  openMaintenance: number;
  openFuel: number;
}

const DriverQuickStats = ({
  vehiclePlate,
  vehicleMakeModel,
  totalTrips,
  totalDistanceKm,
  safetyScore,
  openMaintenance,
  openFuel,
}: DriverQuickStatsProps) => {
  const totalOpen = openMaintenance + openFuel;

  const stats = [
    {
      label: "My Vehicle",
      tooltip: vehiclePlate ? `Assigned vehicle: ${vehicleMakeModel || ""}` : "No vehicle currently assigned",
      value: vehiclePlate || "—",
      sub: vehicleMakeModel || "Not assigned",
      icon: Car,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Trips",
      tooltip: "Lifetime number of trips completed",
      value: totalTrips.toLocaleString(),
      sub: `${Number(totalDistanceKm || 0).toLocaleString()} km`,
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Safety Rating",
      tooltip: safetyScore ? "Your latest driver behavior score" : "No score recorded yet",
      value: safetyScore ? `${Math.round(safetyScore)}/100` : "—",
      sub: safetyScore ? "Based on recent trips" : "Awaiting data",
      icon: Award,
      color: safetyScore && safetyScore >= 80 ? "text-success" : "text-warning",
      bgColor: safetyScore && safetyScore >= 80 ? "bg-success/10" : "bg-warning/10",
      progress: safetyScore || 0,
    },
    {
      label: "Open Requests",
      tooltip: `${openMaintenance} maintenance, ${openFuel} fuel pending`,
      value: totalOpen.toString(),
      sub: `${openMaintenance} maint · ${openFuel} fuel`,
      icon: Clock,
      color: totalOpen > 0 ? "text-accent" : "text-muted-foreground",
      bgColor: totalOpen > 0 ? "bg-accent/10" : "bg-muted/50",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <Card className="glass-strong hover:scale-[1.02] transition-transform duration-300 cursor-default">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold truncate">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{stat.sub}</p>
                  {"progress" in stat && stat.progress !== undefined && (
                    <Progress value={stat.progress} className="h-1 mt-2" />
                  )}
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{stat.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default DriverQuickStats;
