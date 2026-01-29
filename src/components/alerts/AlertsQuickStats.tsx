import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, Bell } from "lucide-react";

interface AlertsQuickStatsProps {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
  resolved: number;
}

const AlertsQuickStats = ({
  total,
  critical,
  warning,
  info,
  unacknowledged,
  resolved,
}: AlertsQuickStatsProps) => {
  const stats = [
    {
      label: "Total Alerts",
      value: total.toString(),
      icon: Bell,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Critical",
      value: critical.toString(),
      icon: AlertTriangle,
      color: critical > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: critical > 0 ? "bg-destructive/10" : "bg-muted/50",
    },
    {
      label: "Warning",
      value: warning.toString(),
      icon: AlertCircle,
      color: warning > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: warning > 0 ? "bg-warning/10" : "bg-muted/50",
    },
    {
      label: "Info",
      value: info.toString(),
      icon: Info,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Pending",
      value: unacknowledged.toString(),
      icon: Clock,
      color: unacknowledged > 0 ? "text-warning" : "text-success",
      bgColor: unacknowledged > 0 ? "bg-warning/10" : "bg-success/10",
    },
    {
      label: "Resolved",
      value: resolved.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className="border border-cyan-500/20 hover:border-cyan-500/40 hover:scale-[1.02] transition-all duration-300"
          style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <stat.icon className={`w-5 h-5 ${stat.color === "text-primary" ? "text-cyan-400" : stat.color === "text-success" ? "text-[#8DC63F]" : stat.color === "text-warning" ? "text-amber-400" : stat.color === "text-destructive" ? "text-red-400" : stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AlertsQuickStats;
