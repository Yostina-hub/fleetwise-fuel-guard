import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Clock, Truck } from "lucide-react";
import { useDispatchJobs } from "@/hooks/useDispatchJobs";
import { useMemo } from "react";
import { differenceInHours, parseISO, isAfter, isBefore, startOfDay } from "date-fns";

const DispatchInsightsCard = () => {
  const { jobs } = useDispatchJobs();

  const insights = useMemo(() => {
    const result: Array<{
      type: "success" | "warning" | "info" | "critical";
      title: string;
      description: string;
      action: string;
    }> = [];

    if (!jobs || jobs.length === 0) {
      result.push({
        type: "info",
        title: "No Dispatch Data",
        description: "Create your first dispatch job to start tracking deliveries.",
        action: "Create job",
      });
      return result;
    }

    const now = new Date();
    const today = startOfDay(now);

    // SLA at risk
    const slaAtRisk = jobs.filter(j => {
      if (!j.sla_deadline_at || j.status === "completed") return false;
      const deadline = parseISO(j.sla_deadline_at);
      const hoursUntil = differenceInHours(deadline, now);
      return hoursUntil <= 2 && hoursUntil > 0;
    });

    if (slaAtRisk.length > 0) {
      result.push({
        type: "critical",
        title: `${slaAtRisk.length} Delivery${slaAtRisk.length > 1 ? "s" : ""} at SLA Risk`,
        description: "These jobs need immediate attention to meet their SLA deadlines.",
        action: "Prioritize now",
      });
    }

    // Unassigned jobs
    const unassigned = jobs.filter(j => !j.driver_id && j.status !== "completed" && j.status !== "cancelled");
    if (unassigned.length > 0) {
      result.push({
        type: "warning",
        title: `${unassigned.length} Unassigned Job${unassigned.length > 1 ? "s" : ""}`,
        description: "These deliveries need a driver assigned for timely completion.",
        action: "Assign drivers",
      });
    }

    // On-time performance
    const completedJobs = jobs.filter(j => j.status === "completed" && j.sla_met !== null);
    if (completedJobs.length >= 5) {
      const onTimeCount = completedJobs.filter(j => j.sla_met).length;
      const onTimeRate = Math.round((onTimeCount / completedJobs.length) * 100);
      
      if (onTimeRate >= 95) {
        result.push({
          type: "success",
          title: "Excellent Delivery Performance",
          description: `${onTimeRate}% on-time delivery rate. Your dispatch operations are running smoothly!`,
          action: "View stats",
        });
      } else if (onTimeRate < 80) {
        result.push({
          type: "warning",
          title: "Delivery Performance Alert",
          description: `${onTimeRate}% on-time rate is below target. Review routes and capacity.`,
          action: "Analyze",
        });
      }
    }

    // Active dispatches
    const activeJobs = jobs.filter(j => j.status === "en_route" || j.status === "dispatched");
    if (activeJobs.length > 0) {
      result.push({
        type: "info",
        title: `${activeJobs.length} Active Dispatch${activeJobs.length > 1 ? "es" : ""}`,
        description: "Track real-time progress on the live map.",
        action: "Open map",
      });
    }

    if (result.length === 0) {
      result.push({
        type: "success",
        title: "Operations Running Smoothly",
        description: "All dispatch jobs are on track with no immediate concerns.",
        action: "View dashboard",
      });
    }

    return result.slice(0, 3);
  }, [jobs]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />;
      case "warning":
        return <Clock className="w-5 h-5 text-warning" aria-hidden="true" />;
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />;
      default:
        return <Truck className="w-5 h-5 text-primary" aria-hidden="true" />;
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
          Dispatch Insights
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

export default DispatchInsightsCard;
