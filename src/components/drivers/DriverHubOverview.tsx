import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Users, Shield, CreditCard, TrendingUp,
  UserPlus, ClipboardCheck, FileSearch, Zap, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, BarChart3, Briefcase,
  ShieldAlert, Radio, Clock, ArrowUpRight, ArrowDownRight,
  Link2, Unlink, Building2, UserCog, Car, Truck, HelpCircle,
} from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface DriverHubOverviewProps {
  onNavigate: (category: string, tab?: string) => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export const DriverHubOverview = ({ onNavigate }: DriverHubOverviewProps) => {
  const { drivers } = useDrivers();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();

  // Fetch vehicle assignments to compute assigned vs. unassigned drivers
  const { data: assignedDriverIds = new Set<string>() } = useQuery({
    queryKey: ["driver-hub-assignments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("assigned_driver_id")
        .eq("organization_id", organizationId!)
        .not("assigned_driver_id", "is", null);
      if (error) throw error;
      return new Set<string>((data || []).map((v: any) => v.assigned_driver_id).filter(Boolean));
    },
  });

  const assignedCount = useMemo(
    () => drivers.filter(d => assignedDriverIds.has(d.id)).length,
    [drivers, assignedDriverIds],
  );
  const unassignedCount = drivers.length - assignedCount;
  const assignedPct = drivers.length > 0 ? Math.round((assignedCount / drivers.length) * 100) : 0;

  // Group by driver type (descending by count)
  const byDriverType = useMemo(() => {
    const counts: Record<string, number> = {};
    drivers.forEach(d => {
      const key = d.driver_type || "unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [drivers]);

  const driverTypeMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    company:        { label: "Company",        icon: Building2,  color: "text-cyan-600 dark:text-cyan-400",       bg: "bg-cyan-500/10" },
    ethio_contract: { label: "Ethio Contract", icon: Shield,     color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10" },
    outsource:      { label: "Outsource",      icon: UserCog,    color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    rental:         { label: "Car Rental",     icon: Car,        color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-500/10" },
    third_party:    { label: "Third Party",    icon: Truck,      color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-500/10" },
    government:     { label: "Government",     icon: Briefcase,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    unspecified:    { label: "Unspecified",    icon: HelpCircle, color: "text-muted-foreground",                  bg: "bg-muted/50" },
  };

  const formatLabel = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const active = drivers.filter(d => d.status === "active").length;
  const inactive = drivers.filter(d => d.status === "inactive").length;
  const suspended = drivers.filter(d => d.status === "suspended").length;

  const expiringLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false;
    const days = Math.floor((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  }).length;

  const expiredLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false;
    return new Date(d.license_expiry) < new Date();
  }).length;

  const avgSafety = drivers.length > 0
    ? Math.round(drivers.reduce((a, d) => a + (d.safety_score || 0), 0) / drivers.length)
    : 0;

  const lowScore = drivers.filter(d => (d.safety_score || 0) < 70).length;
  const totalTrips = drivers.reduce((s, d) => s + (d.total_trips || 0), 0);
  const totalKm = drivers.reduce((s, d) => s + (d.total_distance_km || 0), 0);
  const complianceRate = drivers.length > 0
    ? Math.round(((drivers.length - expiredLicenses) / drivers.length) * 100)
    : 100;

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* ─── KPI Cards ─── */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Active Drivers",
            value: active,
            sub: `${inactive} inactive · ${suspended} suspended`,
            icon: Users,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-500/10",
            trend: "+3",
            up: true,
            action: () => onNavigate("operations", "availability"),
          },
          {
            label: "Safety Score",
            value: avgSafety,
            sub: `${lowScore} below threshold`,
            icon: Shield,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-500/10",
            trend: avgSafety >= 80 ? "+2" : "-1",
            up: avgSafety >= 80,
            action: () => onNavigate("safety", "risk-scoring"),
          },
          {
            label: "License Alerts",
            value: expiredLicenses + expiringLicenses,
            sub: expiredLicenses > 0
              ? `${expiredLicenses} expired · ${expiringLicenses} expiring`
              : `${expiringLicenses} expiring soon`,
            icon: CreditCard,
            color: expiredLicenses > 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400",
            bg: expiredLicenses > 0 ? "bg-destructive/10" : "bg-amber-500/10",
            trend: expiredLicenses > 0 ? `${expiredLicenses}!` : "0",
            up: false,
            action: () => onNavigate("compliance", "licenses"),
          },
          {
            label: "Total Trips",
            value: totalTrips.toLocaleString(),
            sub: `${(totalKm / 1000).toFixed(0)}K km driven`,
            icon: BarChart3,
            color: "text-primary",
            bg: "bg-primary/10",
            trend: "+12%",
            up: true,
            action: () => onNavigate("performance", "analytics"),
          },
        ].map(kpi => (
          <Card
            key={kpi.label}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={kpi.action}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", kpi.bg)}>
                  <kpi.icon className={cn("h-4.5 w-4.5", kpi.color)} />
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  kpi.up ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                )}>
                  {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ─── Workforce Composition: Assignment + Driver Type ─── */}
      <motion.div variants={fadeIn} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workforce Composition
          </h3>
          <button
            onClick={() => navigate("/drivers")}
            className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
          >
            View driver list <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Assignment status cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate("/drivers")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5 text-primary" />
                </div>
                <Badge variant="secondary" className="text-[10px]">All</Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{drivers.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total drivers</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate("/drivers?assignment=assigned")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Link2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge variant="secondary" className="text-[10px]">{assignedPct}%</Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{assignedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Assigned to vehicle</p>
              <Progress value={assignedPct} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate("/drivers?assignment=unassigned")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center",
                  unassignedCount > 0 ? "bg-orange-500/10" : "bg-muted/50",
                )}>
                  <Unlink className={cn(
                    "h-4.5 w-4.5",
                    unassignedCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground",
                  )} />
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {drivers.length > 0 ? 100 - assignedPct : 0}%
                </Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{unassignedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unassignedCount > 0 ? "Available to assign" : "All drivers placed"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Driver type breakdown */}
        {byDriverType.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-1">
              By Driver Type
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {byDriverType.map(([key, count]) => {
                const meta = driverTypeMeta[key] || {
                  ...driverTypeMeta.unspecified,
                  label: formatLabel(key),
                };
                return (
                  <button
                    key={key}
                    onClick={() => navigate(`/drivers?driverType=${encodeURIComponent(key)}`)}
                    className="text-left rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-all p-3 group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", meta.bg)}>
                        <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate flex-1">
                        {meta.label}
                      </p>
                    </div>
                    <p className="text-xl font-bold tabular-nums tracking-tight">{count}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Quick Actions ─── */}
      <motion.div variants={fadeIn}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: "Onboard Driver", icon: UserPlus, section: "compliance", tab: "onboarding" },
            { label: "Compliance Audit", icon: ClipboardCheck, section: "compliance", tab: "compliance" },
            { label: "Review MVR", icon: FileSearch, section: "compliance", tab: "mvr" },
            { label: "Auto-Coaching", icon: Zap, section: "safety", tab: "auto-coaching" },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.section, action.tab)}
              className="flex items-center gap-2.5 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/20 transition-all text-left group"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium flex-1">{action.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── Modules + Status ─── */}
      <motion.div variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module cards */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { key: "operations", label: "Operations", desc: "Availability & comms", icon: Radio, stat: `${active} on duty` },
              { key: "compliance", label: "Compliance", desc: "Licenses & docs", icon: ClipboardCheck, stat: `${expiredLicenses + expiringLicenses} alerts` },
              { key: "safety", label: "Safety & Risk", desc: "Incidents & scoring", icon: ShieldAlert, stat: `${lowScore} at risk` },
              { key: "performance", label: "Performance", desc: "Analytics & training", icon: BarChart3, stat: `Avg ${avgSafety}` },
              { key: "hr-finance", label: "HR & Finance", desc: "Contracts & costs", icon: Briefcase, stat: `${drivers.length} total` },
            ].map(mod => (
              <button
                key={mod.key}
                onClick={() => onNavigate(mod.key)}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:shadow-sm transition-all text-left group"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <mod.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{mod.label}</p>
                  <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{mod.stat}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Fleet health sidebar */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fleet Status</h3>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Status counts */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Active", count: active, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Inactive", count: inactive, icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Suspended", count: suspended, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
                ].map(s => (
                  <div key={s.label} className={cn("p-2.5 rounded-lg", s.bg)}>
                    <s.icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
                    <p className="text-lg font-bold">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Compliance bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Compliance Rate</span>
                  <span className="font-semibold">{complianceRate}%</span>
                </div>
                <Progress value={complianceRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recent drivers */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {drivers.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {d.first_name[0]}{d.last_name[0]}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background",
                        d.status === "active" ? "bg-emerald-500" : d.status === "suspended" ? "bg-destructive" : "bg-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{d.first_name} {d.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.employee_id || "—"}</p>
                    </div>
                  </div>
                  <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[9px] h-5">
                    {d.status}
                  </Badge>
                </div>
              ))}
              {drivers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No drivers yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
};
