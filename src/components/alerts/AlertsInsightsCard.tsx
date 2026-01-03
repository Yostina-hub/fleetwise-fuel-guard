import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Clock, Bell } from "lucide-react";
import { useMemo } from "react";

interface AlertsInsightsCardProps {
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    unacknowledged: number;
    resolved: number;
  };
  alertTypes: string[];
}

const AlertsInsightsCard = ({ stats, alertTypes }: AlertsInsightsCardProps) => {
  const insights = useMemo(() => {
    const result: Array<{
      type: "success" | "warning" | "info" | "critical";
      title: string;
      description: string;
      action: string;
    }> = [];

    if (stats.total === 0) {
      result.push({
        type: "success",
        title: "No Active Alerts",
        description: "Your fleet is operating without any alerts. Great job!",
        action: "View history",
      });
      return result;
    }

    // Critical alerts
    if (stats.critical > 0) {
      result.push({
        type: "critical",
        title: `${stats.critical} Critical Alert${stats.critical > 1 ? "s" : ""}`,
        description: "Immediate attention required. These alerts indicate potential safety issues.",
        action: "View critical",
      });
    }

    // Unacknowledged alerts
    if (stats.unacknowledged > 5) {
      result.push({
        type: "warning",
        title: `${stats.unacknowledged} Pending Alerts`,
        description: "Multiple alerts awaiting acknowledgement. Consider bulk processing.",
        action: "Acknowledge all",
      });
    }

    // Resolution rate
    if (stats.total > 0) {
      const resolutionRate = Math.round((stats.resolved / stats.total) * 100);
      if (resolutionRate >= 80) {
        result.push({
          type: "success",
          title: "High Resolution Rate",
          description: `${resolutionRate}% of alerts have been resolved. Excellent response time!`,
          action: "View metrics",
        });
      } else if (resolutionRate < 50 && stats.total > 10) {
        result.push({
          type: "warning",
          title: "Low Resolution Rate",
          description: `Only ${resolutionRate}% resolved. Consider reviewing alert handling procedures.`,
          action: "Improve process",
        });
      }
    }

    // Common alert types
    if (alertTypes.length > 0) {
      result.push({
        type: "info",
        title: `${alertTypes.length} Alert Type${alertTypes.length > 1 ? "s" : ""} Detected`,
        description: "Analyze patterns to identify recurring issues and prevent future alerts.",
        action: "View patterns",
      });
    }

    if (result.length === 0) {
      result.push({
        type: "success",
        title: "Alert Center: Healthy",
        description: "All alerts are being handled appropriately.",
        action: "View all",
      });
    }

    return result.slice(0, 3);
  }, [stats, alertTypes]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />;
      case "warning":
        return <Clock className="w-5 h-5 text-warning" aria-hidden="true" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />;
      default:
        return <Bell className="w-5 h-5 text-primary" aria-hidden="true" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-warning" aria-hidden="true" />
          Alert Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{insight.title}</span>
                  <Badge variant={getBadgeVariant(insight.type)} className="text-xs">
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                <button className="text-xs text-primary hover:underline font-medium">
                  {insight.action} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AlertsInsightsCard;
