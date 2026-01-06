import { Card, CardContent } from "@/components/ui/card";
import { Route, Clock, Gauge, Fuel, MapPin, Timer, Navigation, AlertTriangle, CheckCircle, PauseCircle, Play } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RouteHistoryQuickStatsProps {
  totalDistance: string;
  duration: number;
  avgSpeed: string;
  maxSpeed: number;
  fuelConsumed: string;
  totalPoints: number;
  validPoints: number;
  movingPoints: number;
  stoppedPoints: number;
  idlePoints: number;
  invalidCoordPoints: number;
  filteredSegments: number;
  startTime: string;
  endTime: string;
}

const RouteHistoryQuickStats = ({
  totalDistance,
  duration,
  avgSpeed,
  maxSpeed,
  fuelConsumed,
  totalPoints,
  validPoints,
  movingPoints,
  stoppedPoints,
  idlePoints,
  invalidCoordPoints,
  filteredSegments,
  startTime,
  endTime,
}: RouteHistoryQuickStatsProps) => {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate data quality percentage
  const dataQuality = totalPoints > 0 ? Math.round((validPoints / totalPoints) * 100) : 0;

  const primaryStats = [
    {
      label: "Distance",
      value: `${totalDistance} km`,
      icon: Route,
      color: "text-primary",
      bgColor: "bg-primary/10",
      tooltip: "Total distance traveled (GPS jumps filtered)",
    },
    {
      label: "Duration",
      value: formatDuration(duration),
      icon: Timer,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      tooltip: `${startTime} - ${endTime}`,
    },
    {
      label: "Avg Speed",
      value: `${avgSpeed} km/h`,
      icon: Gauge,
      color: "text-success",
      bgColor: "bg-success/10",
      tooltip: "Average speed across all data points",
    },
    {
      label: "Max Speed",
      value: `${maxSpeed} km/h`,
      icon: Gauge,
      color: "text-warning",
      bgColor: "bg-warning/10",
      tooltip: "Maximum recorded speed",
    },
    {
      label: "Fuel Used",
      value: `${fuelConsumed}%`,
      icon: Fuel,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      tooltip: "Fuel level change (start - end)",
    },
  ];

  const dataStats = [
    {
      label: "Total Points",
      value: totalPoints.toString(),
      icon: MapPin,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      tooltip: "Total GPS data points received",
    },
    {
      label: "Valid GPS",
      value: validPoints.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      tooltip: "Points with valid coordinates",
    },
    {
      label: "Moving",
      value: movingPoints.toString(),
      icon: Navigation,
      color: "text-primary",
      bgColor: "bg-primary/10",
      tooltip: "Points where speed > 2 km/h",
    },
    {
      label: "Stopped",
      value: stoppedPoints.toString(),
      icon: PauseCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      tooltip: "Points where vehicle was stationary",
    },
    {
      label: "Idling",
      value: idlePoints.toString(),
      icon: Play,
      color: "text-warning",
      bgColor: "bg-warning/10",
      tooltip: "Stopped but engine running",
    },
    {
      label: "Filtered",
      value: (invalidCoordPoints + filteredSegments).toString(),
      icon: AlertTriangle,
      color: invalidCoordPoints + filteredSegments > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: invalidCoordPoints + filteredSegments > 0 ? "bg-destructive/10" : "bg-muted/50",
      tooltip: `${invalidCoordPoints} invalid coords, ${filteredSegments} GPS jumps filtered`,
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Primary Trip Stats */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Trip Summary</h4>
          <div className="grid grid-cols-2 gap-2">
            {primaryStats.map((stat) => (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <Card className="bg-muted/30 hover:scale-[1.02] transition-transform duration-300 cursor-help">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{stat.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Data Quality Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-muted-foreground">Data Quality</h4>
            <span className={`text-xs font-medium ${dataQuality >= 95 ? 'text-success' : dataQuality >= 80 ? 'text-warning' : 'text-destructive'}`}>
              {dataQuality}% valid
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {dataStats.map((stat) => (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <Card className="bg-muted/20 hover:bg-muted/40 transition-colors cursor-help">
                    <CardContent className="p-2 text-center">
                      <stat.icon className={`w-3 h-3 ${stat.color} mx-auto mb-0.5`} aria-hidden="true" />
                      <p className="text-xs font-semibold">{stat.value}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{stat.label}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{stat.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 rounded-md px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>Start: <span className="font-medium text-foreground">{startTime}</span></span>
          </div>
          <span className="text-muted-foreground/50">→</span>
          <span>End: <span className="font-medium text-foreground">{endTime}</span></span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RouteHistoryQuickStats;
