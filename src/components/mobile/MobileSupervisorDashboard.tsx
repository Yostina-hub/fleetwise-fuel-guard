import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car, Fuel, AlertTriangle, MapPin, Wrench, Users,
  ChevronRight, Activity, Clock, Bell, Zap, Navigation,
  Plus, ClipboardList, TrendingUp,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function MobileSupervisorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { vehicles, loading } = useVehicles();
  const { telemetry, isVehicleOnline } = useVehicleTelemetry();

  const stats = useMemo(() => {
    const total = vehicles.length;
    const online = vehicles.filter((v) => isVehicleOnline(v.id)).length;
    const moving = vehicles.filter((v) => {
      const t = telemetry[v.id];
      return t && (t.speed_kmh ?? 0) > 2;
    }).length;
    const idle = online - moving;
    const offline = total - online;

    // Top fuel consumers
    const fuelData = vehicles
      .map((v) => {
        const t = telemetry[v.id];
        return {
          id: v.id,
          plate: v.plate_number,
          make: v.make,
          fuelLevel: t?.fuel_level_percent ?? null,
          speed: t?.speed_kmh ?? 0,
          isOnline: isVehicleOnline(v.id),
        };
      })
      .filter((v) => v.fuelLevel !== null)
      .sort((a, b) => (a.fuelLevel ?? 100) - (b.fuelLevel ?? 100));

    return { total, online, moving, idle, offline, fuelData };
  }, [vehicles, telemetry, isVehicleOnline]);

  const quickActions = [
    { icon: MapPin, label: t("nav.liveTracking", "Live Tracking"), path: "/map", color: "text-blue-400" },
    { icon: Car, label: t("nav.vehicles", "Vehicles"), path: "/vehicles", color: "text-emerald-400" },
    { icon: Fuel, label: t("nav.fuelMonitoring", "Fuel"), path: "/fuel", color: "text-amber-400" },
    { icon: AlertTriangle, label: t("nav.alerts", "Alerts"), path: "/alerts", color: "text-red-400" },
    { icon: Wrench, label: t("nav.maintenance", "Maintenance"), path: "/maintenance", color: "text-purple-400" },
    { icon: Users, label: t("nav.drivers", "Drivers"), path: "/drivers", color: "text-cyan-400" },
    { icon: ClipboardList, label: t("nav.dispatch", "Dispatch"), path: "/dispatch", color: "text-orange-400" },
    { icon: TrendingUp, label: t("nav.reports", "Reports"), path: "/reports", color: "text-pink-400" },
  ];

  const taskActions = [
    { icon: Plus, label: t("mobile.addVehicle", "Add Vehicle"), path: "/vehicles", color: "bg-primary/20 text-primary" },
    { icon: Fuel, label: t("mobile.addFuelEntry", "Add Fuel Entry"), path: "/fuel", color: "bg-amber-500/20 text-amber-400" },
    { icon: Wrench, label: t("mobile.addServiceEntry", "Service Entry"), path: "/work-orders", color: "bg-purple-500/20 text-purple-400" },
    { icon: Navigation, label: t("mobile.assignTask", "Assign Task"), path: "/dispatch", color: "bg-blue-500/20 text-blue-400" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 pb-24">
        {/* Fleet Status Overview */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card/80 backdrop-blur border-border/50" onClick={() => navigate("/vehicles")}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.totalVehicles", "Total Fleet")}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Car className="h-8 w-8 text-primary/50" />
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {stats.online} online
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/50" onClick={() => navigate("/map")}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.activeNow", "Active Now")}</p>
                  <p className="text-2xl font-bold">{stats.moving}</p>
                </div>
                <Activity className="h-8 w-8 text-emerald-500/50" />
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                  {stats.idle} idle
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                  {stats.offline} off
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t("mobile.quickActions", "Quick Actions")}</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-transform touch-manipulation"
              >
                <action.icon className={cn("h-5 w-5", action.color)} />
                <span className="text-[10px] font-medium text-foreground/80 text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task Shortcuts */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t("mobile.fieldTasks", "Field Tasks")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {taskActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border border-border/30 active:scale-95 transition-transform touch-manipulation",
                  action.color
                )}
              >
                <action.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top Fuel Consumers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("mobile.fuelStatus", "Fuel Status")}</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/fuel")}>
              {t("common.viewAll", "View All")} <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardContent className="p-0 divide-y divide-border/30">
              {stats.fuelData.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3 py-2.5 active:bg-muted/50 touch-manipulation"
                  onClick={() => navigate(`/map?vehicle=${v.id}`)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      v.isOnline ? "bg-emerald-400" : "bg-muted-foreground/30"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{v.plate}</p>
                      <p className="text-[10px] text-muted-foreground">{v.make}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Fuel className={cn(
                        "h-3.5 w-3.5",
                        (v.fuelLevel ?? 0) < 20 ? "text-destructive" : (v.fuelLevel ?? 0) < 50 ? "text-amber-400" : "text-emerald-400"
                      )} />
                      <span className={cn(
                        "text-xs font-semibold",
                        (v.fuelLevel ?? 0) < 20 ? "text-destructive" : "text-foreground"
                      )}>
                        {v.fuelLevel?.toFixed(0)}%
                      </span>
                    </div>
                    {v.speed > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {v.speed.toFixed(0)} km/h
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {stats.fuelData.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t("mobile.noFuelData", "No fuel data available")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connectivity Status */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">{t("mobile.storeForward", "Store & Forward")}</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {navigator.onLine ? t("common.online", "Online") : t("common.offline", "Buffering")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
