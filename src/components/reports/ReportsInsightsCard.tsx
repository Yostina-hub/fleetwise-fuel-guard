import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Fuel,
  Shield,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportMetrics } from "@/hooks/useReportData";

interface ReportsInsightsCardProps {
  metrics: ReportMetrics;
}

interface Insight {
  type: "success" | "warning" | "info" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const ReportsInsightsCard = ({ metrics }: ReportsInsightsCardProps) => {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Fuel efficiency insight
    if (metrics.avgEfficiency > 0) {
      if (metrics.efficiencyTrend > 5) {
        insights.push({
          type: "success",
          icon: Fuel,
          title: "Fuel Efficiency Improving",
          description: `Fleet efficiency up ${metrics.efficiencyTrend.toFixed(1)}% - averaging ${metrics.avgEfficiency.toFixed(1)} km/L`,
        });
      } else if (metrics.efficiencyTrend < -5) {
        insights.push({
          type: "warning",
          icon: Fuel,
          title: "Fuel Efficiency Declining",
          description: `Fleet efficiency down ${Math.abs(metrics.efficiencyTrend).toFixed(1)}% - review driving patterns`,
        });
      }
    }

    // Safety insight
    if (metrics.speedingEvents > 10) {
      insights.push({
        type: "danger",
        icon: AlertTriangle,
        title: "High Speeding Events",
        description: `${metrics.speedingEvents} speeding events detected - consider driver coaching`,
      });
    } else if (metrics.speedingEvents === 0 && metrics.totalTrips > 0) {
      insights.push({
        type: "success",
        icon: Shield,
        title: "Excellent Safety Record",
        description: "Zero speeding events recorded this period",
      });
    }

    // Driver performance insight
    if (metrics.driversNeedingCoaching > 0) {
      insights.push({
        type: "warning",
        icon: TrendingDown,
        title: "Drivers Need Coaching",
        description: `${metrics.driversNeedingCoaching} drivers with scores below threshold`,
      });
    }

    // Maintenance insight
    if (metrics.overdueMaintenance > 0) {
      insights.push({
        type: "danger",
        icon: Clock,
        title: "Overdue Maintenance",
        description: `${metrics.overdueMaintenance} vehicles have overdue maintenance schedules`,
      });
    }

    // Trip completion insight
    if (metrics.totalTrips > 0) {
      const completionRate = (metrics.completedTrips / metrics.totalTrips) * 100;
      if (completionRate >= 95) {
        insights.push({
          type: "success",
          icon: CheckCircle2,
          title: "High Trip Completion",
          description: `${completionRate.toFixed(1)}% trip completion rate - excellent performance`,
        });
      } else if (completionRate < 80) {
        insights.push({
          type: "warning",
          icon: TrendingDown,
          title: "Trip Completion Below Target",
          description: `${completionRate.toFixed(1)}% completion rate - investigate causes`,
        });
      }
    }

    // SLA insight
    if (metrics.dispatchJobsTotal > 0 && metrics.slaMetPercentage < 90) {
      insights.push({
        type: "warning",
        icon: Clock,
        title: "SLA Performance",
        description: `Only ${metrics.slaMetPercentage.toFixed(1)}% of jobs met SLA - needs attention`,
      });
    }

    // Default insight if no specific insights
    if (insights.length === 0) {
      insights.push({
        type: "info",
        icon: Lightbulb,
        title: "Data Collection in Progress",
        description: "Continue operating to generate more actionable insights",
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  };

  const insights = generateInsights();

  const getTypeStyles = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" };
      case "warning":
        return { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" };
      case "danger":
        return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" };
      default:
        return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          AI Insights
          <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {insights.map((insight, index) => {
          const styles = getTypeStyles(insight.type);
          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border",
                styles.bg,
                styles.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-1.5 rounded-md", styles.bg)}>
                  <insight.icon className={cn("w-4 h-4", styles.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm", styles.text)}>
                    {insight.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {insight.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
