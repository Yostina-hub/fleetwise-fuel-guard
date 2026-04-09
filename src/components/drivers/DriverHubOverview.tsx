import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users, Shield, AlertTriangle, CreditCard, Clock, TrendingUp,
  UserPlus, ClipboardCheck, FileSearch, Zap, ChevronRight,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";

interface DriverHubOverviewProps {
  onNavigate: (category: string, tab?: string) => void;
}

export const DriverHubOverview = ({ onNavigate }: DriverHubOverviewProps) => {
  const { drivers } = useDrivers();

  const activeDrivers = drivers.filter(d => d.status === "active").length;
  const inactiveDrivers = drivers.filter(d => d.status === "inactive").length;
  const suspendedDrivers = drivers.filter(d => d.status === "suspended").length;

  const expiringLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false;
    const days = Math.floor((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  }).length;

  const expiredLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false;
    return new Date(d.license_expiry) < new Date();
  }).length;

  const avgSafetyScore = drivers.length > 0
    ? Math.round(drivers.reduce((acc, d) => acc + (d.safety_score || 0), 0) / drivers.length)
    : 0;

  const quickActions = [
    { label: "Onboard New Driver", icon: UserPlus, category: "compliance", tab: "onboarding", color: "text-emerald-500" },
    { label: "Run Compliance Audit", icon: ClipboardCheck, category: "compliance", tab: "compliance", color: "text-blue-500" },
    { label: "Review MVR Records", icon: FileSearch, category: "compliance", tab: "mvr", color: "text-amber-500" },
    { label: "Auto-Coaching Queue", icon: Zap, category: "safety", tab: "auto-coaching", color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate("operations", "availability")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Drivers</p>
                <p className="text-3xl font-bold mt-1">{activeDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {inactiveDrivers} inactive · {suspendedDrivers} suspended
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate("performance", "analytics")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Safety Score</p>
                <p className="text-3xl font-bold mt-1">{avgSafetyScore}</p>
                <Progress value={avgSafetyScore} className="h-1.5 mt-2 w-24" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${expiredLicenses > 0 ? "border-l-destructive" : "border-l-amber-500"}`}
          onClick={() => onNavigate("compliance", "licenses")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">License Alerts</p>
                <p className="text-3xl font-bold mt-1">{expiredLicenses + expiringLicenses}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expiredLicenses > 0 && <span className="text-destructive font-medium">{expiredLicenses} expired</span>}
                  {expiredLicenses > 0 && expiringLicenses > 0 && " · "}
                  {expiringLicenses > 0 && <span className="text-amber-500 font-medium">{expiringLicenses} expiring</span>}
                  {expiredLicenses === 0 && expiringLicenses === 0 && "All current"}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${expiredLicenses > 0 ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                <CreditCard className={`h-6 w-6 ${expiredLicenses > 0 ? "text-destructive" : "text-amber-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate("safety", "risk-scoring")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Risk Overview</p>
                <p className="text-3xl font-bold mt-1">{drivers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total drivers monitored</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50"
                onClick={() => onNavigate(action.category, action.tab)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center`}>
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Driver Status Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fleet Driver Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{activeDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">Active</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{inactiveDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">Inactive</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold">{suspendedDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">Suspended</p>
              </div>
            </div>

            {/* Recent drivers */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground font-medium mb-3">Recently Added</p>
              <div className="space-y-2">
                {drivers.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                        {d.first_name[0]}{d.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{d.first_name} {d.last_name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.employee_id || "No ID"}</p>
                      </div>
                    </div>
                    <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
