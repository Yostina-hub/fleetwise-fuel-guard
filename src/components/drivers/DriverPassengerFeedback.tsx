import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, MessageSquare, Users, TrendingUp, Calendar, Quote } from "lucide-react";
import { format } from "date-fns";
import { useDriverPassengerFeedback } from "@/hooks/useDriverPassengerFeedback";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  driverId: string;
  driverName: string;
}

const StarsRow = ({ value }: { value: number | null }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          value && i <= Math.round(value)
            ? "fill-amber-400 text-amber-400"
            : "text-muted-foreground/30"
        }`}
      />
    ))}
    <span className="ml-1.5 text-[11px] font-semibold tabular-nums">
      {value ? value.toFixed(1) : "—"}
    </span>
  </div>
);

const AxisCard = ({
  label,
  icon: Icon,
  score,
  color,
}: {
  label: string;
  icon: any;
  score: number | null;
  color: string;
}) => (
  <Card className="border-border/60">
    <CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        </div>
        <span className="text-lg font-bold tabular-nums">
          {score?.toFixed(1) ?? "—"}
          <span className="text-[10px] text-muted-foreground font-normal">/5</span>
        </span>
      </div>
      <Progress value={score ? (score / 5) * 100 : 0} className="h-1.5" />
    </CardContent>
  </Card>
);

export const DriverPassengerFeedback = ({ driverId, driverName }: Props) => {
  const { data, isLoading } = useDriverPassengerFeedback(driverId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data || data.totalCompleted === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-sm">No passenger feedback yet</p>
          <p className="text-xs mt-1">{driverName} hasn't completed any rated trips.</p>
        </CardContent>
      </Card>
    );
  }

  const ratingTone =
    (data.avgDriver30d ?? data.avgDriver ?? 0) >= 4.5
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : (data.avgDriver30d ?? data.avgDriver ?? 0) >= 3.5
      ? "text-primary bg-primary/10 border-primary/30"
      : "text-red-400 bg-red-500/10 border-red-500/30";

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Users className="w-3 h-3" />
                Passenger Feedback
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums">
                  {data.avgOverall?.toFixed(1) ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 5.0 overall</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <StarsRow value={data.avgOverall} />
                <Badge variant="outline" className={`text-[10px] ${ratingTone}`}>
                  {data.totalRated} rated trips
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
              <div>
                <div className="text-[10px] text-muted-foreground">Response rate</div>
                <div className="text-lg font-semibold tabular-nums">{data.responseRate}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">30-day avg</div>
                <div className="text-lg font-semibold tabular-nums">
                  {data.avgDriver30d?.toFixed(1) ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-axis breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AxisCard label="Driver" icon={Star} score={data.avgDriver} color="text-amber-400" />
        <AxisCard label="Vehicle" icon={TrendingUp} score={data.avgVehicle} color="text-cyan-400" />
        <AxisCard label="Punctuality" icon={Calendar} score={data.avgPunctuality} color="text-violet-400" />
      </div>

      {/* 30-day mini trend */}
      {data.trend30d.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3 h-3" /> 30-Day Driver Rating Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-16">
              {data.trend30d.map(p => (
                <div
                  key={p.date}
                  className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors min-w-[3px]"
                  style={{ height: `${(p.score / 5) * 100}%` }}
                  title={`${p.date}: ${p.score.toFixed(1)}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent comments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="w-3 h-3" /> Recent Passenger Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recent.filter(r => r.rating_comment || r.requester_feedback).length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No written feedback yet — only star ratings.
            </p>
          ) : (
            data.recent
              .filter(r => r.rating_comment || r.requester_feedback)
              .slice(0, 8)
              .map(r => (
                <div key={r.id} className="border-l-2 border-primary/40 pl-3 py-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      {/* Anonymous — passenger identity is intentionally hidden from drivers */}
                      <span className="text-xs font-medium text-muted-foreground">Anonymous passenger</span>
                      <StarsRow value={r.driver_rating} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {r.rated_at ? format(new Date(r.rated_at), "MMM dd, yyyy") : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic flex gap-1">
                    <Quote className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                    {r.rating_comment || r.requester_feedback}
                  </p>
                  {r.purpose && (
                    <p className="text-[10px] text-muted-foreground/70">Trip: {r.purpose}</p>
                  )}
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
