import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Star, Target, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface KPIProps {
  requests: any[];
}

export const VehicleRequestKPI = ({ requests }: KPIProps) => {
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <FileText className="w-5 h-5 text-violet-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t('kpi.totalRequests', 'Total Requests')}</p>
            <p className="text-lg font-bold">{totalRequests}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t('kpi.avgAssignment', 'Avg Assignment Time')}</p>
            <p className="text-lg font-bold">{formatMinutes(avgAssignmentMinutes)}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t('kpi.avgCompletion', 'Avg Completion Time')}</p>
            <p className="text-lg font-bold">{formatMinutes(avgCompletionMinutes)}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <Target className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t('kpi.slaRate', 'SLA Met Rate')}</p>
            <p className="text-lg font-bold">{slaRate}%</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground">{t('kpi.avgRating', 'Avg Requester Rating')}</p>
            <p className="text-lg font-bold">{avgRating}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
