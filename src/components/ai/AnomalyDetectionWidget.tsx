import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  Fuel,
  Gauge,
  MapPin,
  Clock,
  Zap,
  ChevronRight
} from "lucide-react";
import { useFleetAI, AnomalyResult } from "@/hooks/useFleetAI";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AnomalyDetectionWidgetProps {
  checkType?: 'fuel' | 'speed' | 'gps' | 'offline' | 'idle';
  autoLoad?: boolean;
  className?: string;
}

const AnomalyIcon = ({ type }: { type: AnomalyResult['type'] }) => {
  switch (type) {
    case 'fuel_theft':
      return <Fuel className="h-4 w-4" />;
    case 'speed_anomaly':
      return <Gauge className="h-4 w-4" />;
    case 'gps_tampering':
      return <MapPin className="h-4 w-4" />;
    case 'offline_extended':
      return <Clock className="h-4 w-4" />;
    case 'idle_excessive':
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const SeverityBadge = ({ severity }: { severity: AnomalyResult['severity'] }) => {
  const variants: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-orange-500 text-white",
    medium: "bg-warning text-warning-foreground",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Badge className={cn("text-xs", variants[severity])}>
      {severity}
    </Badge>
  );
};

export function AnomalyDetectionWidget({ 
  checkType,
  autoLoad = false,
  className
}: AnomalyDetectionWidgetProps) {
  const { loading, anomalies, anomalySummary, detectAnomalies } = useFleetAI();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (autoLoad && !hasLoaded) {
      detectAnomalies(checkType);
      setHasLoaded(true);
    }
  }, [autoLoad, hasLoaded, detectAnomalies, checkType]);

  const handleRefresh = () => {
    detectAnomalies(checkType);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 shadow-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Anomaly Detection
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Zap className="h-3 w-3" />
                  Real-time
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Automated threat & issue detection
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Scan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : anomalySummary ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{anomalySummary.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-500/10">
                <p className="text-lg font-bold text-orange-600">{anomalySummary.high}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-warning/10">
                <p className="text-lg font-bold text-warning">{anomalySummary.medium}</p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-lg font-bold">{anomalySummary.low}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>

            {/* Anomalies List */}
            {anomalies.length > 0 ? (
              <ScrollArea className="h-[240px]">
                <div className="space-y-2">
                  {anomalies.map((anomaly, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border transition-colors hover:bg-muted/50",
                        anomaly.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                        anomaly.severity === 'high' && "border-orange-500/30 bg-orange-500/5",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          anomaly.severity === 'critical' && "bg-destructive/20 text-destructive",
                          anomaly.severity === 'high' && "bg-orange-500/20 text-orange-600",
                          anomaly.severity === 'medium' && "bg-warning/20 text-warning",
                          anomaly.severity === 'low' && "bg-muted text-muted-foreground",
                        )}>
                          <AnomalyIcon type={anomaly.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{anomaly.vehiclePlate}</span>
                            <SeverityBadge severity={anomaly.severity} />
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{anomaly.description}</p>
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <ChevronRight className="h-3 w-3" />
                            <span className="truncate">{anomaly.recommendedAction}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(anomaly.detectedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-success/10 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-success">All Clear</p>
                <p className="text-xs text-muted-foreground">No anomalies detected</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-3 rounded-full bg-muted w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-2">Run Anomaly Detection</p>
            <p className="text-xs text-muted-foreground mb-4">
              Scan for fuel theft, speed violations, GPS tampering, and more
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Start Scan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
