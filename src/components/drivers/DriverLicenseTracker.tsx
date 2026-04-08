import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useDrivers, Driver } from "@/hooks/useDrivers";
import { AlertTriangle, CheckCircle2, XCircle, Clock, ShieldAlert, CreditCard } from "lucide-react";
import { differenceInDays, isPast, format } from "date-fns";

const getExpiryInfo = (date?: string) => {
  if (!date) return { status: "unknown", days: null, label: "No expiry set", color: "text-muted-foreground" };
  const days = differenceInDays(new Date(date), new Date());
  if (isPast(new Date(date))) return { status: "expired", days, label: "Expired", color: "text-destructive" };
  if (days <= 30) return { status: "critical", days, label: `${days} days`, color: "text-destructive" };
  if (days <= 90) return { status: "warning", days, label: `${days} days`, color: "text-amber-400" };
  return { status: "ok", days, label: `${days} days`, color: "text-emerald-400" };
};

export const DriverLicenseTracker = () => {
  const { drivers, loading } = useDrivers();

  const { expired, critical, warning, ok, unknown } = useMemo(() => {
    const groups = { expired: [] as Driver[], critical: [] as Driver[], warning: [] as Driver[], ok: [] as Driver[], unknown: [] as Driver[] };
    drivers.forEach(d => {
      const info = getExpiryInfo(d.license_expiry);
      groups[info.status as keyof typeof groups]?.push(d);
    });
    return groups;
  }, [drivers]);

  const complianceRate = drivers.length > 0
    ? Math.round(((ok.length + warning.length) / drivers.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Expired", count: expired.length, icon: XCircle, color: "text-destructive" },
          { label: "Critical (<30d)", count: critical.length, icon: ShieldAlert, color: "text-destructive" },
          { label: "Warning (<90d)", count: warning.length, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Valid", count: ok.length, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "No Data", count: unknown.length, icon: Clock, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fleet License Compliance</span>
            <span className="text-sm font-bold">{complianceRate}%</span>
          </div>
          <Progress value={complianceRate} />
        </CardContent>
      </Card>

      {/* Action Required */}
      {(expired.length > 0 || critical.length > 0) && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Immediate Action Required
            </CardTitle>
            <CardDescription>{expired.length + critical.length} drivers need attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...expired, ...critical].map(driver => {
              const info = getExpiryInfo(driver.license_expiry);
              return (
                <div key={driver.id} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={driver.avatar_url || undefined} />
                    <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                      {driver.first_name[0]}{driver.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{driver.first_name} {driver.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">License: {driver.license_number} · Class: {driver.license_class || "N/A"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="destructive" className="text-[10px]">
                      {info.status === "expired" ? "EXPIRED" : `${info.days}d left`}
                    </Badge>
                    {driver.license_expiry && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(driver.license_expiry), "MMM d, yyyy")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Drivers License Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            All Driver Licenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {drivers.map(driver => {
            const info = getExpiryInfo(driver.license_expiry);
            return (
              <div key={driver.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={driver.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {driver.first_name[0]}{driver.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{driver.first_name} {driver.last_name}</p>
                  <p className="text-[10px] text-muted-foreground">{driver.license_number}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{driver.license_class || "—"}</span>
                <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
