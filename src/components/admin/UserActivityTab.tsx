import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Clock, Users, MousePointerClick, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";

function fmtDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds < 1) return "0s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface SessionRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  active_seconds: number;
  page_count: number;
  last_active_at: string;
  last_path: string | null;
}

interface EventRow {
  id: string;
  user_id: string;
  event_type: string;
  event_category: string | null;
  resource_type: string | null;
  resource_id: string | null;
  path: string | null;
  occurred_at: string;
  metadata: any;
}

export default function UserActivityTab() {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"summary" | "sessions" | "events">("summary");

  const { data: profiles = [] } = useQuery({
    queryKey: ["activity-profiles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("organization_id", organizationId!);
      return data ?? [];
    },
  });

  const profileById = useMemo(() => {
    const m = new Map<string, { email: string | null; full_name: string | null }>();
    for (const p of profiles as any[]) m.set(p.id, { email: p.email, full_name: p.full_name });
    return m;
  }, [profiles]);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<SessionRow[]>({
    queryKey: ["admin-user-sessions", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_sessions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("started_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<EventRow[]>({
    queryKey: ["admin-user-activity-events", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_activity_events")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  // Per-user summary aggregated client-side from sessions (last 30 days)
  const summary = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, {
      user_id: string;
      sessions: number;
      activeSeconds: number;
      totalSeconds: number;
      pages: number;
      lastActive: string | null;
    }>();
    for (const s of sessions) {
      if (new Date(s.started_at).getTime() < cutoff) continue;
      const cur = map.get(s.user_id) ?? {
        user_id: s.user_id,
        sessions: 0,
        activeSeconds: 0,
        totalSeconds: 0,
        pages: 0,
        lastActive: null as string | null,
      };
      cur.sessions += 1;
      cur.activeSeconds += s.active_seconds || 0;
      const end = s.ended_at ?? s.last_active_at;
      cur.totalSeconds += Math.max(0, (new Date(end).getTime() - new Date(s.started_at).getTime()) / 1000);
      cur.pages += s.page_count || 0;
      if (!cur.lastActive || new Date(s.last_active_at) > new Date(cur.lastActive)) {
        cur.lastActive = s.last_active_at;
      }
      map.set(s.user_id, cur);
    }

    // Add request submissions count from events
    const reqByUser = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "request_submitted" || e.event_type === "request_created") {
        reqByUser.set(e.user_id, (reqByUser.get(e.user_id) ?? 0) + 1);
      }
    }

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        requests: reqByUser.get(r.user_id) ?? 0,
      }))
      .sort((a, b) => b.activeSeconds - a.activeSeconds);
  }, [sessions, events]);

  const filteredSummary = useMemo(() => {
    if (!search) return summary;
    const q = search.toLowerCase();
    return summary.filter((row) => {
      const p = profileById.get(row.user_id);
      return (
        p?.email?.toLowerCase().includes(q) ||
        p?.full_name?.toLowerCase().includes(q) ||
        row.user_id.toLowerCase().includes(q)
      );
    });
  }, [summary, search, profileById]);

  // Top stats
  const stats = useMemo(() => {
    const activeSessions = sessions.filter((s) => s.is_active).length;
    const totalUsers = summary.length;
    const totalActive = summary.reduce((acc, r) => acc + r.activeSeconds, 0);
    const totalEvents = events.length;
    return { activeSessions, totalUsers, totalActive, totalEvents };
  }, [sessions, summary, events]);

  function exportCsv() {
    const rows = [
      ["User", "Email", "Sessions (30d)", "Active time", "Total time", "Pages", "Requests", "Last active"],
      ...filteredSummary.map((r) => {
        const p = profileById.get(r.user_id);
        return [
          p?.full_name ?? "",
          p?.email ?? r.user_id,
          String(r.sessions),
          fmtDuration(r.activeSeconds),
          fmtDuration(r.totalSeconds),
          String(r.pages),
          String(r.requests),
          r.lastActive ? format(new Date(r.lastActive), "yyyy-MM-dd HH:mm") : "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Active users (30d)" value={String(stats.totalUsers)} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Live sessions" value={String(stats.activeSessions)} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Active time (30d)" value={fmtDuration(stats.totalActive)} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Activity events (recent)" value={String(stats.totalEvents)} />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <TabsList>
            <TabsTrigger value="summary">Per User</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-user activity (last 30 days)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Active time</TableHead>
                      <TableHead className="text-right">Total time</TableHead>
                      <TableHead className="text-right">Pages</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead>Last active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {loadingSessions ? "Loading…" : "No activity recorded yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSummary.map((r) => {
                        const p = profileById.get(r.user_id);
                        return (
                          <TableRow key={r.user_id}>
                            <TableCell>
                              <div className="font-medium">{p?.full_name || "—"}</div>
                              <div className="text-xs text-muted-foreground">{p?.email || r.user_id}</div>
                            </TableCell>
                            <TableCell className="text-right">{r.sessions}</TableCell>
                            <TableCell className="text-right font-mono">{fmtDuration(r.activeSeconds)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{fmtDuration(r.totalSeconds)}</TableCell>
                            <TableCell className="text-right">{r.pages}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{r.requests}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.lastActive ? formatDistanceToNow(new Date(r.lastActive), { addSuffix: true }) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Pages</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.slice(0, 200).map((s) => {
                      const p = profileById.get(s.user_id);
                      const totalSec = ((s.ended_at ? new Date(s.ended_at).getTime() : new Date(s.last_active_at).getTime()) - new Date(s.started_at).getTime()) / 1000;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{p?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{p?.email || s.user_id.slice(0, 8)}</div>
                          </TableCell>
                          <TableCell className="text-xs">{format(new Date(s.started_at), "MMM d, HH:mm")}</TableCell>
                          <TableCell className="text-xs">
                            {s.ended_at ? format(new Date(s.ended_at), "MMM d, HH:mm") : <span className="text-success">live</span>}
                            <div className="text-muted-foreground">{fmtDuration(totalSec)}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmtDuration(s.active_seconds)}</TableCell>
                          <TableCell className="text-right">{s.page_count}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.device_type} · {s.browser}
                          </TableCell>
                          <TableCell>
                            {s.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="outline">{s.ended_reason ?? "ended"}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {loadingSessions ? "Loading…" : "No sessions yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 200).map((e) => {
                      const p = profileById.get(e.user_id);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(e.occurred_at), "MMM d, HH:mm:ss")}</TableCell>
                          <TableCell className="text-xs">
                            <div>{p?.full_name || "—"}</div>
                            <div className="text-muted-foreground">{p?.email || e.user_id.slice(0, 8)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{e.event_type}</Badge>
                            {e.event_category && <span className="ml-2 text-xs text-muted-foreground">{e.event_category}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {e.resource_type ? `${e.resource_type}${e.resource_id ? "#" + e.resource_id.slice(0, 8) : ""}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{e.path || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {events.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {loadingEvents ? "Loading…" : "No events yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
