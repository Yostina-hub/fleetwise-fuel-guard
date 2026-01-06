import { Card, CardContent } from "@/components/ui/card";
import { Route, Clock, Gauge, Fuel, MapPin, Timer, Navigation, AlertTriangle, CheckCircle, PauseCircle, Play, Activity, Database, Filter, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

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
  const movingPercentage = validPoints > 0 ? Math.round((movingPoints / validPoints) * 100) : 0;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Hero Stats - Distance & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <CardContent className="p-3 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{totalDistance}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Kilometers</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Route className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
            <CardContent className="p-3 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{formatDuration(duration)}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Duration</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Timer className="w-4 h-4 text-blue-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Speed & Fuel Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-muted/30 hover:bg-muted/50 transition-all duration-300 cursor-help group">
                <CardContent className="p-2.5 text-center">
                  <Gauge className="w-4 h-4 text-success mx-auto mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <p className="text-sm font-bold">{avgSpeed}</p>
                  <p className="text-[9px] text-muted-foreground">Avg km/h</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Average speed across all data points</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-muted/30 hover:bg-muted/50 transition-all duration-300 cursor-help group">
                <CardContent className="p-2.5 text-center">
                  <Zap className="w-4 h-4 text-warning mx-auto mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <p className="text-sm font-bold">{maxSpeed}</p>
                  <p className="text-[9px] text-muted-foreground">Max km/h</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Maximum recorded speed</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-muted/30 hover:bg-muted/50 transition-all duration-300 cursor-help group">
                <CardContent className="p-2.5 text-center">
                  <Fuel className="w-4 h-4 text-orange-500 mx-auto mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <p className="text-sm font-bold">{fuelConsumed}%</p>
                  <p className="text-[9px] text-muted-foreground">Fuel Used</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Fuel level change (start - end)</TooltipContent>
          </Tooltip>
        </div>

        {/* Data Quality Section */}
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-muted">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-semibold">Data Quality</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                dataQuality >= 95 ? 'bg-success/10 text-success' : 
                dataQuality >= 80 ? 'bg-warning/10 text-warning' : 
                'bg-destructive/10 text-destructive'
              }`}>
                {dataQuality}%
              </span>
            </div>
            
            <Progress 
              value={dataQuality} 
              className="h-1.5"
            />
            
            {/* Point Breakdown */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3" aria-hidden="true" />
                  Total
                </span>
                <span className="font-semibold">{totalPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-success" aria-hidden="true" />
                  Valid
                </span>
                <span className="font-semibold text-success">{validPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Navigation className="w-3 h-3 text-primary" aria-hidden="true" />
                  Moving
                </span>
                <span className="font-semibold text-primary">{movingPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <PauseCircle className="w-3 h-3" aria-hidden="true" />
                  Stopped
                </span>
                <span className="font-semibold">{stoppedPoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Play className="w-3 h-3 text-warning" aria-hidden="true" />
                  Idling
                </span>
                <span className="font-semibold text-warning">{idlePoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Filter className="w-3 h-3 text-destructive" aria-hidden="true" />
                  Filtered
                </span>
                <span className="font-semibold text-destructive">{invalidCoordPoints + filteredSegments}</span>
              </div>
            </div>

            {/* Filtered Details */}
            {(invalidCoordPoints > 0 || filteredSegments > 0) && (
              <div className="pt-2 border-t border-dashed border-muted-foreground/20">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  Filtered Data Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-destructive/5 rounded px-2 py-1">
                    <span className="text-muted-foreground">Invalid Coords:</span>
                    <span className="font-medium text-destructive ml-1">{invalidCoordPoints}</span>
                  </div>
                  <div className="bg-destructive/5 rounded px-2 py-1">
                    <span className="text-muted-foreground">GPS Jumps:</span>
                    <span className="font-medium text-destructive ml-1">{filteredSegments}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-muted-foreground/10">
              <Activity className="w-3 h-3 text-primary" aria-hidden="true" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Movement Ratio</span>
                  <span className="font-medium">{movingPercentage}%</span>
                </div>
                <Progress value={movingPercentage} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Range */}
        <div className="flex items-center justify-between text-xs bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-muted-foreground">Start:</span>
            <span className="font-semibold">{startTime}</span>
          </div>
          <div className="flex-1 mx-3 h-px bg-gradient-to-r from-success/50 via-muted-foreground/30 to-destructive/50" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">End:</span>
            <span className="font-semibold">{endTime}</span>
            <div className="w-2 h-2 rounded-full bg-destructive" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RouteHistoryQuickStats;
