import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Battery,
  BatteryWarning,
  BatteryCharging,
  Search,
  AlertTriangle,
  ThermometerSun,
  Gauge,
  CheckCircle,
  MapPin,
  Navigation,
} from "lucide-react";
import { useAlerts, Alert } from "@/hooks/useAlerts";
import { useVehicles } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import AlertMiniMap from "./AlertMiniMap";

const EV_ALERT_TYPES = [
  "low_battery",
  "battery_critical",
  "charging_fault",
  "range_low",
  "battery_overheating",
  "charging_complete",
  "battery_degradation",
  "ev_system",
];

export function EVAlertsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const { alerts, loading, acknowledgeAlert, resolveAlert, refetch } = useAlerts();
  const { vehicles } = useVehicles();

  // Realtime subscription for EV alerts
  useEffect(() => {
    if (!organizationId) return;

    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`ev-alerts-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            refetch();
            // Toast for new EV alerts
            if (payload.eventType === 'INSERT') {
              const newAlert = payload.new as any;
              const isEV = EV_ALERT_TYPES.some(t => newAlert.alert_type?.includes(t));
              if (isEV) {
                toast({
                  title: `⚡ EV Alert: ${newAlert.title || newAlert.alert_type}`,
                  description: newAlert.message?.slice(0, 100),
                  variant: newAlert.severity === 'critical' ? 'destructive' : 'default',
                });
              }
            }
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  // Filter to only EV-related alerts or alerts for electric vehicles
  const evAlerts = useMemo(() => {
    const evVehicleIds = new Set(
      vehicles
        .filter((v) => v.fuel_type === "electric" || v.fuel_type === "hybrid")
        .map((v) => v.id)
    );

    return alerts.filter(
      (a) =>
        EV_ALERT_TYPES.some((t) => a.alert_type?.toLowerCase().includes(t)) ||
        (a.vehicle_id && evVehicleIds.has(a.vehicle_id))
    );
  }, [alerts, vehicles]);

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "Unknown";
    return vehicles.find((v) => v.id === vehicleId)?.plate_number || "Unknown";
  };

  const getTypeIcon = (alertType: string) => {
    if (alertType.includes("battery_critical") || alertType.includes("low_battery"))
      return <BatteryWarning className="w-5 h-5 text-destructive" />;
    if (alertType.includes("charging"))
      return <BatteryCharging className="w-5 h-5 text-primary" />;
    if (alertType.includes("range"))
      return <Gauge className="w-5 h-5 text-warning" />;
    if (alertType.includes("overheat") || alertType.includes("temperature"))
      return <ThermometerSun className="w-5 h-5 text-destructive" />;
    if (alertType.includes("degradation"))
      return <Battery className="w-5 h-5 text-warning" />;
    return <Zap className="w-5 h-5 text-primary" />;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="animate-pulse">Critical</Badge>;
      case "warning":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Warning</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const filteredAlerts = useMemo(() => {
    return evAlerts.filter((alert) => {
      const matchesSearch =
        searchQuery === "" ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getVehiclePlate(alert.vehicle_id).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
      const matchesType = typeFilter === "all" || alert.alert_type?.includes(typeFilter);

      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [evAlerts, searchQuery, severityFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: evAlerts.length,
    critical: evAlerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length,
    warning: evAlerts.filter((a) => a.severity === "warning" && a.status !== "resolved").length,
    unresolved: evAlerts.filter((a) => a.status !== "resolved").length,
    resolved: evAlerts.filter((a) => a.status === "resolved").length,
  }), [evAlerts]);

  const handleViewOnMap = useCallback((alert: Alert) => {
    if (alert.lat && alert.lng) {
      navigate(`/map?lat=${alert.lat}&lng=${alert.lng}&alertId=${alert.id}`);
    }
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* EV Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-strong border">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total EV Alerts</div>
          </CardContent>
        </Card>
        <Card className="glass-strong border border-destructive/30">
          <CardContent className="p-4 text-center">
            <BatteryWarning className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
        <Card className="glass-strong border border-warning/30">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-warning" />
            <div className="text-2xl font-bold text-warning">{stats.warning}</div>
            <div className="text-xs text-muted-foreground">Warning</div>
          </CardContent>
        </Card>
        <Card className="glass-strong border">
          <CardContent className="p-4 text-center">
            <Battery className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.unresolved}</div>
            <div className="text-xs text-muted-foreground">Unresolved</div>
          </CardContent>
        </Card>
        <Card className="glass-strong border border-primary/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-primary">{stats.resolved}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-strong border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search EV alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="low_battery">Low Battery</SelectItem>
                <SelectItem value="battery_critical">Battery Critical</SelectItem>
                <SelectItem value="charging_fault">Charging Fault</SelectItem>
                <SelectItem value="range_low">Low Range</SelectItem>
                <SelectItem value="battery_overheating">Overheating</SelectItem>
                <SelectItem value="battery_degradation">Degradation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card className="glass-strong border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Electric Vehicle Alerts
            {stats.unresolved > 0 && (
              <Badge variant="destructive">{stats.unresolved} Active</Badge>
            )}
            <Badge variant="outline" className="text-xs ml-auto">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1.5 animate-pulse" />
              Real-time
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading EV alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No EV alerts found</h3>
              <p className="text-muted-foreground">
                Electric vehicle alerts for battery, charging, and range issues will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div key={alert.id}>
                  <div
                    className={`flex items-start gap-4 p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer ${
                      expandedAlert === alert.id ? 'border-primary/40' : ''
                    }`}
                    onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                  >
                    <div className="mt-1">{getTypeIcon(alert.alert_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{alert.title}</span>
                        {getSeverityBadge(alert.severity)}
                        <Badge variant="outline" className="text-xs">
                          {alert.alert_type?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Vehicle: <span className="font-medium text-foreground">{getVehiclePlate(alert.vehicle_id)}</span></span>
                        <span>{formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}</span>
                        {alert.lat && alert.lng && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                          </span>
                        )}
                        <Badge variant={alert.status === "resolved" ? "secondary" : "outline"} className="text-xs">
                          {alert.status}
                        </Badge>
                      </div>
                    </div>
                    {alert.status !== "resolved" && (
                      <div className="flex gap-2 shrink-0">
                        {alert.status === "unacknowledged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeAlert(alert.id);
                            }}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveAlert(alert.id);
                          }}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded: Mini Map */}
                  {expandedAlert === alert.id && (
                    <div className="mt-2 ml-12 animate-fade-in">
                      <AlertMiniMap
                        lat={alert.lat}
                        lng={alert.lng}
                        severity={alert.severity}
                        title={getVehiclePlate(alert.vehicle_id)}
                        height="180px"
                        onNavigate={alert.lat && alert.lng ? () => handleViewOnMap(alert) : undefined}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
