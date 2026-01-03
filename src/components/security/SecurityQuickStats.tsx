import { Card, CardContent } from "@/components/ui/card";
import { Key, History, Shield, FileText, AlertTriangle, CheckCircle } from "lucide-react";

interface SecurityQuickStatsProps {
  activeApiKeys: number;
  auditLogsToday: number;
  retentionPolicies: number;
  pendingGdprRequests: number;
}

const SecurityQuickStats = ({
  activeApiKeys,
  auditLogsToday,
  retentionPolicies,
  pendingGdprRequests,
}: SecurityQuickStatsProps) => {
  const stats = [
    {
      label: "Active API Keys",
      value: activeApiKeys.toString(),
      icon: Key,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Audit Logs Today",
      value: auditLogsToday.toString(),
      icon: History,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Retention Policies",
      value: retentionPolicies.toString(),
      icon: FileText,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Pending GDPR",
      value: pendingGdprRequests.toString(),
      icon: pendingGdprRequests > 0 ? AlertTriangle : CheckCircle,
      color: pendingGdprRequests > 0 ? "text-warning" : "text-success",
      bgColor: pendingGdprRequests > 0 ? "bg-warning/10" : "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SecurityQuickStats;
