import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Users, Shield, AlertTriangle, CreditCard, TrendingUp,
  UserPlus, ClipboardCheck, FileSearch, Zap, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Activity, Radio,
  BarChart3, Briefcase, ShieldAlert, Clock, Award,
  Flame, Target, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { cn } from "@/lib/utils";

interface DriverHubOverviewProps {
  onNavigate: (category: string, tab?: string) => void;
}

const MotionCard = motion.create(Card);

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 300 } },
};

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

  const totalTrips = drivers.reduce((s, d) => s + (d.total_trips || 0), 0);
  const totalKm = drivers.reduce((s, d) => s + (d.total_distance_km || 0), 0);
  const lowScoreDrivers = drivers.filter(d => (d.safety_score || 0) < 70).length;

  const kpis = [
    {
      label: "Active Drivers",
      value: activeDrivers,
      subtitle: `${inactiveDrivers} inactive · ${suspendedDrivers} suspended`,
      icon: Users,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-500",
      trend: "+3",
      trendUp: true,
      action: () => onNavigate("operations", "availability"),
    },
    {
      label: "Safety Score",
      value: avgSafetyScore,
      subtitle: `${lowScoreDrivers} below threshold`,
      icon: Shield,
      gradient: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/30",
      iconColor: "text-blue-500",
      trend: avgSafetyScore >= 80 ? "+2" : "-1",
      trendUp: avgSafetyScore >= 80,
      action: () => onNavigate("safety", "risk-scoring"),
    },
    {
      label: "License Alerts",
      value: expiredLicenses + expiringLicenses,
      subtitle: expiredLicenses > 0
        ? `${expiredLicenses} expired · ${expiringLicenses} expiring`
        : expiringLicenses > 0 ? `${expiringLicenses} expiring soon` : "All current",
      icon: CreditCard,
      gradient: expiredLicenses > 0 ? "from-destructive/20 to-destructive/5" : "from-amber-500/20 to-amber-600/5",
      border: expiredLicenses > 0 ? "border-destructive/30" : "border-amber-500/30",
      iconColor: expiredLicenses > 0 ? "text-destructive" : "text-amber-500",
      trend: expiredLicenses > 0 ? `${expiredLicenses}!` : "0",
      trendUp: false,
      action: () => onNavigate("compliance", "licenses"),
    },
    {
      label: "Total Trips",
      value: totalTrips.toLocaleString(),
      subtitle: `${(totalKm / 1000).toFixed(0)}K km driven`,
      icon: BarChart3,
      gradient: "from-purple-500/20 to-purple-600/5",
      border: "border-purple-500/30",
      iconColor: "text-purple-500",
      trend: "+12%",
      trendUp: true,
      action: () => onNavigate("performance", "analytics"),
    },
  ];

  const quickActions = [
    { label: "Onboard New Driver", desc: "Start the driver qualification workflow", icon: UserPlus, category: "compliance", tab: "onboarding", gradient: "from-emerald-500 to-emerald-600" },
    { label: "Compliance Audit", desc: "Run fleet-wide compliance check", icon: ClipboardCheck, category: "compliance", tab: "compliance", gradient: "from-blue-500 to-blue-600" },
    { label: "Review MVR Records", desc: "Check motor vehicle reports", icon: FileSearch, category: "compliance", tab: "mvr", gradient: "from-amber-500 to-amber-600" },
    { label: "Auto-Coaching Queue", desc: "AI-driven coaching assignments", icon: Zap, category: "safety", tab: "auto-coaching", gradient: "from-purple-500 to-purple-600" },
  ];

  const moduleCards = [
    { key: "operations", label: "Operations", desc: "Availability, leaderboards & comms", icon: Radio, color: "text-emerald-500", bg: "bg-emerald-500/10", stats: `${activeDrivers} on duty` },
    { key: "compliance", label: "Compliance", desc: "Licenses, docs & audit calendar", icon: ClipboardCheck, color: "text-blue-500", bg: "bg-blue-500/10", stats: `${expiredLicenses + expiringLicenses} alerts` },
    { key: "safety", label: "Safety & Risk", desc: "Incidents, fatigue & risk scoring", icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10", stats: `${lowScoreDrivers} at risk` },
    { key: "performance", label: "Performance", desc: "Analytics, reviews & training", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-500/10", stats: `Avg ${avgSafetyScore}` },
    { key: "hr-finance", label: "HR & Finance", desc: "Contracts, costs & rewards", icon: Briefcase, color: "text-pink-500", bg: "bg-pink-500/10", stats: `${drivers.length} total` },
  ];

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      {/* Hero KPI Strip */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <MotionCard
            key={kpi.label}
            variants={item}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative overflow-hidden cursor-pointer group transition-shadow hover:shadow-xl",
              kpi.border
            )}
            onClick={kpi.action}
          >
            {/* Gradient overlay */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", kpi.gradient)} />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="text-4xl font-black tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-background/80 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform")}>
                    <kpi.icon className={cn("h-6 w-6", kpi.iconColor)} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    kpi.trendUp
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.trend}
                  </div>
                </div>
              </div>
              {/* Sparkline bar */}
              {typeof kpi.value === "number" && kpi.label === "Safety Score" && (
                <div className="mt-3">
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${kpi.value}%` }}
                      transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </MotionCard>
        ))}
      </motion.div>

      {/* Quick Actions — horizontal command bar */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(action.category, action.tab)}
              className="group relative flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-lg transition-all text-left"
            >
              <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow", action.gradient)}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{action.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{action.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Module Explorer + Fleet Status */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Explorer */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Modules</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {moduleCards.map((mod, i) => (
              <motion.div
                key={mod.key}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(mod.key)}
                className="group cursor-pointer rounded-xl border bg-card p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", mod.bg)}>
                    <mod.icon className={cn("h-4.5 w-4.5", mod.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{mod.label}</p>
                    <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">{mod.stats}</Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Fleet Health Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fleet Health</h3>
          </div>

          {/* Status Ring */}
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Active", count: activeDrivers, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
                  { label: "Inactive", count: inactiveDrivers, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
                  { label: "Suspended", count: suspendedDrivers, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/20" },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    whileHover={{ scale: 1.05 }}
                    className={cn("p-3 rounded-xl ring-1", s.bg, s.ring)}
                  >
                    <s.icon className={cn("h-6 w-6 mx-auto mb-1.5", s.color)} />
                    <p className="text-xl font-black">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Compliance gauge */}
              <div className="mt-5 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Compliance Rate</span>
                  <span className="text-xs font-bold">
                    {drivers.length > 0
                      ? Math.round(((drivers.length - expiredLicenses) / drivers.length) * 100)
                      : 100}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${drivers.length > 0 ? ((drivers.length - expiredLicenses) / drivers.length) * 100 : 100}%` }}
                    transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Drivers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {drivers.slice(0, 5).map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center justify-between py-1.5 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] font-bold text-primary ring-2 ring-background">
                        {d.first_name[0]}{d.last_name[0]}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        d.status === "active" ? "bg-emerald-500" : d.status === "suspended" ? "bg-destructive" : "bg-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs font-medium leading-none">{d.first_name} {d.last_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{d.employee_id || "No ID"}</p>
                    </div>
                  </div>
                  <Badge
                    variant={d.status === "active" ? "default" : "secondary"}
                    className="text-[9px] h-5"
                  >
                    {d.status}
                  </Badge>
                </motion.div>
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
