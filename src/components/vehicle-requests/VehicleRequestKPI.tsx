import { Card } from "@/components/ui/card";
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

  type TonePreset = {
    iconBg: string;
    iconText: string;
    activeRing: string;
    activeBg: string;
    accent: string;
  };

  const cards: Array<{
    key: string;
    label: string;
    value: string | number;
    sublabel?: string;
    icon: any;
    tone: TonePreset;
    filter: StatusFilter;
    title: string;
    primary?: boolean;
  }> = [
    {
      key: "total",
      label: t("kpi.totalRequests", "Total Requests"),
      value: totalRequests,
      sublabel: "in selected range",
      icon: FileText,
      primary: true,
      tone: {
        iconBg: "bg-violet-500/10",
        iconText: "text-violet-500",
        activeRing: "ring-violet-500/40",
        activeBg: "bg-violet-500/5",
        accent: "bg-violet-500",
      },
      filter: "all",
      title: "Show all requests",
    },
    {
      key: "assignment",
      label: t("kpi.avgAssignment", "Avg Assignment"),
      value: formatMinutes(avgAssignmentMinutes),
      sublabel: "request → assigned",
      icon: Clock,
      tone: {
        iconBg: "bg-primary/10",
        iconText: "text-primary",
        activeRing: "ring-primary/40",
        activeBg: "bg-primary/5",
        accent: "bg-primary",
      },
      filter: "pending",
      title: "Show pending requests awaiting assignment",
    },
    {
      key: "completion",
      label: t("kpi.avgCompletion", "Avg Completion"),
      value: formatMinutes(avgCompletionMinutes),
      sublabel: "request → done",
      icon: TrendingUp,
      tone: {
        iconBg: "bg-emerald-500/10",
        iconText: "text-emerald-500",
        activeRing: "ring-emerald-500/40",
        activeBg: "bg-emerald-500/5",
        accent: "bg-emerald-500",
      },
      filter: "completed",
      title: "Show completed requests",
    },
    {
      key: "sla",
      label: t("kpi.slaRate", "SLA Met Rate"),
      value: `${slaRate}%`,
      sublabel: "within target",
      icon: Target,
      tone: {
        iconBg: "bg-blue-500/10",
        iconText: "text-blue-500",
        activeRing: "ring-blue-500/40",
        activeBg: "bg-blue-500/5",
        accent: "bg-blue-500",
      },
      filter: "completed",
      title: "Show completed requests (SLA basis)",
    },
    {
      key: "rating",
      label: t("kpi.avgRating", "Requester Rating"),
      value: avgRating,
      sublabel: `${ratedRequests.length} rated`,
      icon: Star,
      tone: {
        iconBg: "bg-amber-500/10",
        iconText: "text-amber-500",
        activeRing: "ring-amber-500/40",
        activeBg: "bg-amber-500/5",
        accent: "bg-amber-500",
      },
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
              "text-left w-full group",
              clickable &&
                "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl"
            )}
          >
            <Card
              className={cn(
                "relative overflow-hidden transition-all duration-200 border-border/60",
                clickable && "hover:border-border hover:shadow-md hover:-translate-y-0.5",
                isActive && `ring-2 ${c.tone.activeRing} ${c.tone.activeBg} shadow-md border-transparent`
              )}
            >
              {/* Top accent bar — visible on active, subtle on hover */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-0.5 transition-opacity",
                  c.tone.accent,
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )}
              />
              <div className="p-2.5 flex items-center gap-2.5">
                <div
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-transform",
                    c.tone.iconBg,
                    isActive && "scale-105"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", c.tone.iconText)} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate leading-tight">
                    {c.label}
                  </p>
                  <p
                    className={cn(
                      "font-bold leading-tight tabular-nums mt-0.5",
                      c.primary ? "text-lg" : "text-base"
                    )}
                  >
                    {c.value}
                  </p>
                  {c.sublabel && (
                    <p className="text-[10px] text-muted-foreground/80 truncate leading-tight">
                      {c.sublabel}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
};
