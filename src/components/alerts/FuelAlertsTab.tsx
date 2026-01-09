import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Fuel,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useFuelConsumptionAlerts } from "@/hooks/useFuelConsumptionAlerts";
import { useVehicles } from "@/hooks/useVehicles";
import { formatDistanceToNow } from "date-fns";

export function FuelAlertsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { alerts, loading, acknowledgeAlert, resolveAlert, getAlertStats } = useFuelConsumptionAlerts();
  const { vehicles } = useVehicles();

  const stats = getAlertStats();

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

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
        return <TrendingUp className="w-5 h-5 text-destructive" />;
      case "low_fuel":
        return <Fuel className="w-5 h-5 text-warning" />;
      case "abnormal_pattern":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      case "refuel_mismatch":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <Fuel className="w-5 h-5 text-primary" />;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchQuery === "" ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getVehiclePlate(alert.vehicle_id).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesType = typeFilter === "all" || alert.alert_type === typeFilter;
    
    return matchesSearch && matchesSeverity && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.critical + stats.high}</p>
              <p className="text-sm text-muted-foreground">Critical/High</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{stats.medium}</p>
              <p className="text-sm text-muted-foreground">Medium</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{stats.total - stats.unresolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search fuel alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="high_consumption">High Consumption</SelectItem>
                <SelectItem value="low_fuel">Low Fuel</SelectItem>
                <SelectItem value="abnormal_pattern">Abnormal Pattern</SelectItem>
                <SelectItem value="refuel_mismatch">Refuel Mismatch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" />
            Fuel Consumption Alerts
            {stats.unresolved > 0 && (
              <Badge variant="destructive">{stats.unresolved} Active</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Fuel className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No fuel alerts found</h3>
                <p className="text-muted-foreground">
                  There are no fuel consumption alerts matching your criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : alert.severity === "high"
                        ? "border-destructive/20 bg-destructive/5"
                        : alert.severity === "medium"
                        ? "border-warning/30 bg-warning/5"
                        : "border-border"
                    } ${alert.is_resolved ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{alert.title}</span>
                            {getSeverityBadge(alert.severity)}
                            {alert.is_resolved && (
                              <Badge variant="outline" className="border-success text-success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="font-mono">{getVehiclePlate(alert.vehicle_id)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </span>
                            {alert.variance_percent && (
                              <span className={alert.variance_percent > 0 ? "text-destructive" : "text-success"}>
                                {alert.variance_percent > 0 ? "+" : ""}
                                {alert.variance_percent.toFixed(1)}% variance
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!alert.is_resolved && (
                        <div className="flex flex-col gap-1">
                          {!alert.is_acknowledged && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}