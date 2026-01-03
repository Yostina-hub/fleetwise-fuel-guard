import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useMemo } from "react";
import { differenceInDays, parseISO, isAfter } from "date-fns";

const MaintenanceInsightsCard = () => {
  const { schedules } = useMaintenanceSchedules();

  const insights = useMemo(() => {
    const result: Array<{
      type: "success" | "warning" | "info" | "critical";
      title: string;
      description: string;
      action: string;
    }> = [];

    if (!schedules || schedules.length === 0) {
      result.push({
        type: "info",
        title: "No Maintenance Data",
        description: "Start tracking your fleet's maintenance to get actionable insights.",
        action: "Create your first schedule",
      });
      return result;
    }

    const now = new Date();
    const overdue = schedules.filter(s => s.next_due_date && isAfter(now, parseISO(s.next_due_date)));
    const upcoming = schedules.filter(s => {
      if (!s.next_due_date) return false;
      const dueDate = parseISO(s.next_due_date);
      const daysUntil = differenceInDays(dueDate, now);
      return daysUntil >= 0 && daysUntil <= 7;
    });

    // Critical: Overdue services
    if (overdue.length > 0) {
      result.push({
        type: "critical",
        title: `${overdue.length} Overdue Service${overdue.length > 1 ? "s" : ""}`,
        description: "These vehicles have exceeded their scheduled maintenance dates and need immediate attention.",
        action: "Schedule now",
      });
    }

    // Warning: Upcoming services this week
    if (upcoming.length > 0) {
      result.push({
        type: "warning",
        title: `${upcoming.length} Service${upcoming.length > 1 ? "s" : ""} Due This Week`,
        description: "Plan ahead to avoid service disruptions and keep your fleet running smoothly.",
        action: "View schedule",
      });
    }

    // Success: Good compliance
    const complianceRate = schedules.length > 0 
      ? ((schedules.length - overdue.length) / schedules.length) * 100 
      : 100;
    
    if (complianceRate >= 90 && schedules.length > 3) {
      result.push({
        type: "success",
        title: "Excellent Maintenance Compliance",
        description: `Your fleet maintains a ${Math.round(complianceRate)}% on-time service rate. Keep up the great work!`,
        action: "View details",
      });
    }

    // Info: Pattern detection
    const oilChanges = schedules.filter(s => s.service_type?.toLowerCase().includes("oil"));
    if (oilChanges.length >= 3) {
      result.push({
        type: "info",
        title: "Oil Change Pattern Detected",
        description: "Consider bulk purchasing oil and filters to reduce per-vehicle costs.",
        action: "Optimize costs",
      });
    }

    if (result.length === 0) {
      result.push({
        type: "success",
        title: "Fleet Health: Good",
        description: "All maintenance schedules are on track with no immediate concerns.",
        action: "View all",
      });
    }

    return result.slice(0, 3);
  }, [schedules]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />;
      case "warning":
        return <Clock className="w-5 h-5 text-warning" aria-hidden="true" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />;
      default:
        return <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />;
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
          Maintenance Insights
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

export default MaintenanceInsightsCard;
