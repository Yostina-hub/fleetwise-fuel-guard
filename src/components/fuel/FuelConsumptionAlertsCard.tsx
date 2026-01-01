import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Fuel,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Bell,
  Loader2,
} from "lucide-react";
import { useFuelConsumptionAlerts } from "@/hooks/useFuelConsumptionAlerts";
import { useVehicles } from "@/hooks/useVehicles";
import { formatDistanceToNow } from "date-fns";

interface FuelConsumptionAlertsCardProps {
  getVehiclePlateFromContext?: (vehicleId: string) => string;
}

export default function FuelConsumptionAlertsCard({ getVehiclePlateFromContext }: FuelConsumptionAlertsCardProps) {
  const { alerts, loading, acknowledgeAlert, resolveAlert, getAlertStats } = useFuelConsumptionAlerts({
    isResolved: false,
  });
  
  // Only call useVehicles if context function is not provided
  const { vehicles } = useVehicles(!getVehiclePlateFromContext);
  
  const getVehiclePlate = (vehicleId: string) => {
    if (getVehiclePlateFromContext) {
      return getVehiclePlateFromContext(vehicleId);
    }
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const stats = getAlertStats();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="animate-pulse">Critical</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "high_consumption":
        return <TrendingUp className="w-4 h-4 text-destructive" />;
      case "low_fuel":
        return <Fuel className="w-4 h-4 text-warning" />;
      case "abnormal_pattern":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      case "refuel_mismatch":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" />
            Fuel Consumption Alerts
          </div>
          {stats.unresolved > 0 && (
            <Badge variant="destructive">{stats.unresolved} Active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/5">
            <p className="text-lg font-bold text-destructive/80">{stats.high}</p>
            <p className="text-xs text-muted-foreground">High</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-warning/10">
            <p className="text-lg font-bold text-warning">{stats.medium}</p>
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <p className="text-lg font-bold">{stats.low}</p>
            <p className="text-xs text-muted-foreground">Low</p>
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
              <p className="font-medium">No Active Alerts</p>
              <p className="text-sm">Fuel consumption is within normal parameters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.severity === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : alert.severity === "high"
                      ? "border-destructive/20 bg-destructive/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{alert.title}</span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="font-mono">{getVehiclePlate(alert.vehicle_id)}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                          {alert.variance_percent && (
                            <>
                              <span>•</span>
                              <span className={alert.variance_percent > 0 ? "text-destructive" : "text-success"}>
                                {alert.variance_percent > 0 ? "+" : ""}
                                {alert.variance_percent.toFixed(1)}% variance
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!alert.is_acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Ack
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
