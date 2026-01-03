import { Card, CardContent } from "@/components/ui/card";
import { Webhook, Plug, Upload, Database, CheckCircle, XCircle } from "lucide-react";

interface IntegrationsQuickStatsProps {
  activeWebhooks: number;
  totalIntegrations: number;
  bulkJobsCompleted: number;
  failedJobs: number;
}

const IntegrationsQuickStats = ({
  activeWebhooks,
  totalIntegrations,
  bulkJobsCompleted,
  failedJobs,
}: IntegrationsQuickStatsProps) => {
  const stats = [
    {
      label: "Active Webhooks",
      value: activeWebhooks.toString(),
      icon: Webhook,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Integrations",
      value: totalIntegrations.toString(),
      icon: Plug,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Jobs Completed",
      value: bulkJobsCompleted.toString(),
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Failed Jobs",
      value: failedJobs.toString(),
      icon: XCircle,
      color: failedJobs > 0 ? "text-destructive" : "text-success",
      bgColor: failedJobs > 0 ? "bg-destructive/10" : "bg-success/10",
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

export default IntegrationsQuickStats;
