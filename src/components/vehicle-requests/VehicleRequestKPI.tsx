import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Star, Target, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "assigned" | "completed" | "rejected" | "cancelled";

interface KPIProps {
  requests: any[];
  activeStatus?: StatusFilter;
  onStatusChange?: (status: StatusFilter) => void;
}

export const VehicleRequestKPI = ({ requests, activeStatus = "all", onStatusChange }: KPIProps) => {
  const { t } = useTranslation();
  const totalRequests = requests.length;

  const completedWithTimes = requests.filter(
    (r: any) => r.status === "completed" && r.assigned_at && r.created_at
  );

  const avgAssignmentMinutes =
    completedWithTimes.length > 0
      ? Math.round(
          completedWithTimes.reduce((sum: number, r: any) => {
            const created = new Date(r.created_at).getTime();
            const assigned = new Date(r.assigned_at).getTime();
            return sum + (assigned - created) / 60000;
          }, 0) / completedWithTimes.length
        )
      : 0;

  const avgCompletionMinutes =
    completedWithTimes.filter((r: any) => r.completed_at).length > 0
      ? Math.round(
          completedWithTimes
            .filter((r: any) => r.completed_at)
            .reduce((sum: number, r: any) => {
              const created = new Date(r.created_at).getTime();
              const completed = new Date(r.completed_at).getTime();
              return sum + (completed - created) / 60000;
            }, 0) /
            completedWithTimes.filter((r: any) => r.completed_at).length
        )
      : 0;

  const withinTarget = completedWithTimes.filter((r: any) => {
    const target = r.kpi_target_minutes || 30;
    const actual = r.actual_assignment_minutes ||
      (new Date(r.assigned_at).getTime() - new Date(r.created_at).getTime()) / 60000;
    return actual <= target;
  });

  const slaRate = completedWithTimes.length > 0
    ? Math.round((withinTarget.length / completedWithTimes.length) * 100)
    : 100;

  const ratedRequests = requests.filter((r: any) => r.requester_rating != null);
  const avgRating = ratedRequests.length > 0
    ? (ratedRequests.reduce((s: number, r: any) => s + r.requester_rating, 0) / ratedRequests.length).toFixed(1)
    : "—";

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const cards: Array<{
    key: string;
    label: string;
    value: string | number;
    icon: any;
    iconClass: string;
    ringClass: string;
    filter: StatusFilter;
    title: string;
  }> = [
    {
      key: "total",
      label: t("kpi.totalRequests", "Total Requests"),
      value: totalRequests,
      icon: FileText,
      iconClass: "text-violet-500",
      ringClass: "ring-violet-500/50",
      filter: "all",
      title: "Show all requests",
    },
    {
      key: "assignment",
      label: t("kpi.avgAssignment", "Avg Assignment Time"),
      value: formatMinutes(avgAssignmentMinutes),
      icon: Clock,
      iconClass: "text-primary",
      ringClass: "ring-primary/50",
      filter: "pending",
      title: "Show pending requests awaiting assignment",
    },
    {
      key: "completion",
      label: t("kpi.avgCompletion", "Avg Completion Time"),
      value: formatMinutes(avgCompletionMinutes),
      icon: TrendingUp,
      iconClass: "text-emerald-500",
      ringClass: "ring-emerald-500/50",
      filter: "completed",
      title: "Show completed requests",
    },
    {
      key: "sla",
      label: t("kpi.slaRate", "SLA Met Rate"),
      value: `${slaRate}%`,
      icon: Target,
      iconClass: "text-blue-500",
      ringClass: "ring-blue-500/50",
      filter: "completed",
      title: "Show completed requests (SLA basis)",
    },
    {
      key: "rating",
      label: t("kpi.avgRating", "Avg Requester Rating"),
      value: avgRating,
      icon: Star,
      iconClass: "text-amber-500",
      ringClass: "ring-amber-500/50",
      filter: "completed",
      title: "Show completed (rated) requests",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const clickable = !!onStatusChange;
        const isActive =
          clickable &&
          activeStatus === c.filter &&
          // "all" only highlights the Total card; the other cards filtering
          // to "completed" should only highlight when their own status is
          // active (which is also "completed" — that's expected here).
          !(c.filter === "all" && c.key !== "total");

        const Wrapper: any = clickable ? "button" : "div";
        return (
          <Wrapper
            key={c.key}
            type={clickable ? "button" : undefined}
            onClick={clickable ? () => onStatusChange!(c.filter) : undefined}
            aria-pressed={clickable ? isActive : undefined}
            title={clickable ? c.title : undefined}
            className={cn(
              "text-left w-full",
              clickable &&
                "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
            )}
          >
            <Card
              className={cn(
                "transition-all duration-200",
                clickable && "hover:scale-[1.02] hover:shadow-md",
                isActive && `ring-2 ${c.ringClass} shadow-md`
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${c.iconClass}`} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="text-lg font-bold leading-tight">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
};
