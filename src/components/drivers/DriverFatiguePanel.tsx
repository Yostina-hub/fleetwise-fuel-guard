import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDriverFatigue } from "@/hooks/useDriverFatigue";
import { 
  Clock, 
  AlertTriangle, 
  Coffee, 
  Moon, 
  Activity,
  Eye,
  Car,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Brain
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverFatiguePanelProps {
  driverId: string;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
    default: return 'text-muted-foreground bg-muted border-muted-foreground/30';
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'low': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'moderate': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <Activity className="w-5 h-5" />;
  }
};

export const DriverFatiguePanel = ({ driverId }: DriverFatiguePanelProps) => {
  const { 
    hosLogs,
    fatigueIndicators,
    latestFatigue,
    hosSummary,
    HOS_LIMITS,
    isLoading 
  } = useDriverFatigue(driverId);

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const drivingPercent = (hosSummary.drivingHours24h / HOS_LIMITS.driving_limit_hours) * 100;
  const weeklyPercent = (hosSummary.drivingHours8Days / HOS_LIMITS.weekly_limit_hours_70) * 100;

  return (
    <div className="space-y-6">
      {/* Current Fatigue Status */}
      {latestFatigue && (
        <Card className={cn(
          "glass-strong border-2",
          getRiskColor(latestFatigue.fatigue_risk_level)
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRiskIcon(latestFatigue.fatigue_risk_level)}
                <div>
                  <CardTitle>Current Fatigue Status</CardTitle>
                  <CardDescription>
                    Last updated: {format(new Date(latestFatigue.recorded_at), "MMM d, h:mm a")}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-3xl font-bold",
                  latestFatigue.risk_score >= 70 ? "text-red-500" :
                  latestFatigue.risk_score >= 50 ? "text-orange-500" :
                  latestFatigue.risk_score >= 30 ? "text-yellow-500" :
                  "text-green-500"
                )}>
                  {latestFatigue.risk_score}
                </div>
                <div className="text-sm text-muted-foreground">Risk Score</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Driving 24h</span>
                </div>
                <p className="text-xl font-bold">{latestFatigue.driving_hours_24h?.toFixed(1) || 0}h</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Since Rest</span>
                </div>
                <p className="text-xl font-bold">{latestFatigue.hours_since_rest?.toFixed(1) || 0}h</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Eye Closures</span>
                </div>
                <p className="text-xl font-bold">{latestFatigue.eye_closure_events || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Lane Departures</span>
                </div>
                <p className="text-xl font-bold">{latestFatigue.lane_departure_events || 0}</p>
              </div>
            </div>

            {latestFatigue.recommendations && latestFatigue.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">AI Recommendations:</p>
                <ul className="space-y-1">
                  {(latestFatigue.recommendations as string[]).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hours of Service Summary */}
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle>Hours of Service (HOS)</CardTitle>
          </div>
          <CardDescription>Federal compliance tracking and remaining drive time</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Warnings */}
          {hosSummary.warnings.length > 0 && (
            <div className="space-y-2 mb-6">
              {hosSummary.warnings.map((warning, idx) => (
                <Alert key={idx} variant="destructive" className="bg-orange-500/10 border-orange-500/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Can Drive Status */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-lg mb-6",
            hosSummary.canDrive 
              ? "bg-green-500/10 border border-green-500/30" 
              : "bg-red-500/10 border border-red-500/30"
          )}>
            <div className="flex items-center gap-3">
              {hosSummary.canDrive ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <p className="font-semibold">
                  {hosSummary.canDrive ? "Cleared to Drive" : "Rest Required"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hosSummary.canDrive 
                    ? `${hosSummary.remainingDriveTime.toFixed(1)} hours remaining today`
                    : "HOS limits exceeded - mandatory rest period"
                  }
                </p>
              </div>
            </div>
            {hosSummary.canDrive && (
              <Badge className="bg-green-500/20 text-green-500">
                {Math.floor(hosSummary.remainingDriveTime)}h {Math.round((hosSummary.remainingDriveTime % 1) * 60)}m left
              </Badge>
            )}
          </div>

          {/* Progress Bars */}
          <div className="space-y-4">
            {/* Daily Driving Limit */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Daily Driving ({HOS_LIMITS.driving_limit_hours}h limit)</span>
                <span className={drivingPercent >= 90 ? "text-red-500 font-bold" : ""}>
                  {hosSummary.drivingHours24h.toFixed(1)} / {HOS_LIMITS.driving_limit_hours}h
                </span>
              </div>
              <Progress 
                value={Math.min(drivingPercent, 100)} 
                className={cn("h-3", drivingPercent >= 90 && "[&>div]:bg-red-500")}
              />
            </div>

            {/* 70-Hour Weekly Limit */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>8-Day Driving ({HOS_LIMITS.weekly_limit_hours_70}h limit)</span>
                <span className={weeklyPercent >= 90 ? "text-red-500 font-bold" : ""}>
                  {hosSummary.drivingHours8Days.toFixed(1)} / {HOS_LIMITS.weekly_limit_hours_70}h
                </span>
              </div>
              <Progress 
                value={Math.min(weeklyPercent, 100)} 
                className={cn("h-3", weeklyPercent >= 90 && "[&>div]:bg-red-500")}
              />
            </div>

            {/* Time Since Break */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Time Since 30-min Break ({HOS_LIMITS.break_required_after_hours}h limit)</span>
                <span className={hosSummary.hoursSinceLastBreak >= 7 ? "text-orange-500 font-bold" : ""}>
                  {hosSummary.hoursSinceLastBreak.toFixed(1)}h
                </span>
              </div>
              <Progress 
                value={(hosSummary.hoursSinceLastBreak / HOS_LIMITS.break_required_after_hours) * 100} 
                className={cn("h-3", hosSummary.hoursSinceLastBreak >= 7 && "[&>div]:bg-orange-500")}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Coffee className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{hosSummary.restHours24h.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Rest (24h)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Zap className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{Math.round(hosSummary.consecutiveDrivingMinutes)}m</p>
              <p className="text-xs text-muted-foreground">Continuous Driving</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{hosSummary.violations}</p>
              <p className="text-xs text-muted-foreground">Violations (8d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fatigue History */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle>Fatigue History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {fatigueIndicators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No fatigue data recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {fatigueIndicators.map((indicator) => (
                  <div 
                    key={indicator.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      getRiskColor(indicator.fatigue_risk_level)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getRiskIcon(indicator.fatigue_risk_level)}
                      <div>
                        <p className="font-medium capitalize">{indicator.fatigue_risk_level} Risk</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(indicator.recorded_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{indicator.risk_score}</p>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
