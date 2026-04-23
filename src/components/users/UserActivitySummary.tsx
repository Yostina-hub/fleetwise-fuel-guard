import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function fmtDuration(sec: number) {
  if (!sec || sec < 1) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface Props {
  userId: string;
}

/**
 * Compact per-user activity panel — shown on the profile / user detail dialog.
 * Aggregates the user's last 30 days of sessions + recent activity events.
 */
export default function UserActivitySummary({ userId }: Props) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["user-activity-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("user_sessions")
        .select("id, started_at, ended_at, last_active_at, active_seconds, page_count, browser, device_type, is_active, ended_reason")
        .eq("user_id", userId)
        .gte("started_at", cutoff)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["user-activity-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_activity_events")
        .select("id, event_type, event_category, resource_type, resource_id, occurred_at, path")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = sessions.reduce(
    (acc: { active: number; total: number; pages: number }, s: any) => {
      acc.active += s.active_seconds || 0;
      const end = s.ended_at ?? s.last_active_at;
      acc.total += Math.max(0, (new Date(end).getTime() - new Date(s.started_at).getTime()) / 1000);
      acc.pages += s.page_count || 0;
      return acc;
    },
    { active: 0, total: 0, pages: 0 },
  );

  const lastSession = sessions[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={<Calendar className="h-4 w-4" />} label="Sessions (30d)" value={String(sessions.length)} />
        <MetricCard icon={<Clock className="h-4 w-4" />} label="Active time" value={fmtDuration(totals.active)} />
        <MetricCard icon={<Eye className="h-4 w-4" />} label="Pages viewed" value={String(totals.pages)} />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Last seen"
          value={lastSession ? formatDistanceToNow(new Date(lastSession.last_active_at), { addSuffix: true }) : "—"}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-3">Recent sessions</div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions in the last 30 days.</div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium text-foreground">
                      {format(new Date(s.started_at), "MMM d, HH:mm")}
                    </div>
                    <div className="text-muted-foreground">
                      {s.device_type} · {s.browser}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{fmtDuration(s.active_seconds || 0)}</div>
                    {s.is_active ? (
                      <Badge variant="default" className="text-[10px]">Live</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{s.ended_reason ?? "ended"}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Recent activity</div>
            <div className="space-y-2">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                    <span className="text-muted-foreground truncate max-w-[16rem]">
                      {e.resource_type
                        ? `${e.resource_type}${e.resource_id ? "#" + e.resource_id.slice(0, 8) : ""}`
                        : e.path || "—"}
                    </span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </CardContent>
    </Card>
  );
}
