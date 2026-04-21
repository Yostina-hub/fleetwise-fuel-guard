import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Cable,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface OutboxRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  response_code: number | null;
  response_body: string | null;
  payload: any;
  created_at: string;
  pushed_at: string | null;
  next_attempt_at: string | null;
}

interface QueueCounts {
  pending: number;
  pushed: number;
  failed: number;
  awaiting_credentials: number;
}

type FilterKey = "all" | "pending" | "failed" | "awaiting_credentials" | "pushed";

const PAGE_SIZE = 20;

/**
 * ERP Oracle outbox status card with:
 *  - Live counters + filter tabs
 *  - Per-event detail drawer (payload, response, errors)
 *  - Retry-now for failed/awaiting items (resets to pending immediately)
 *  - Manual replay for already-pushed events (re-enqueues a copy)
 *  - Realtime refresh on outbox changes
 */
export const ErpOracleQueueCard = () => {
  const { organizationId } = useOrganization();
  const [counts, setCounts] = useState<QueueCounts>({
    pending: 0,
    pushed: 0,
    failed: 0,
    awaiting_credentials: 0,
  });
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<OutboxRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [{ data: statusRows }, { data: latest }] = await Promise.all([
        supabase
          .from("erp_outbox")
          .select("status")
          .eq("organization_id", organizationId),
        supabase
          .from("erp_outbox")
          .select(
            "id, entity_type, entity_id, event_type, status, attempts, last_error, response_code, response_body, payload, created_at, pushed_at, next_attempt_at",
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE),
      ]);

      const c: QueueCounts = {
        pending: 0,
        pushed: 0,
        failed: 0,
        awaiting_credentials: 0,
      };
      for (const r of statusRows || []) {
        const s = (r.status as keyof QueueCounts) ?? "pending";
        if (s in c) c[s]++;
      }
      setCounts(c);
      setRows((latest as OutboxRow[]) || []);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription so the queue updates as events flow through
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`erp-outbox-${organizationId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "erp_outbox",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, refresh]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("erp-oracle-push");
      if (error) throw error;
      const pushed = (data as any)?.pushed ?? 0;
      const failed = (data as any)?.failed ?? 0;
      const paused = (data as any)?.paused ?? 0;
      if (paused > 0) {
        toast.warning(`Paused ${paused} item(s) — Oracle credentials missing`);
      } else {
        toast.success(`ERP sync: ${pushed} pushed, ${failed} failed`);
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ERP sync failed");
    } finally {
      setRunning(false);
    }
  };

  const retryItem = async (row: OutboxRow) => {
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from("erp_outbox")
        .update({
          status: "pending",
          attempts: 0,
          last_error: null,
          next_attempt_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Reset to pending — running sync…");
      await runNow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setBusyId(null);
    }
  };

  const replayItem = async (row: OutboxRow) => {
    setBusyId(row.id);
    try {
      const { error } = await supabase.from("erp_outbox").insert({
        organization_id: organizationId,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        event_type: `${row.event_type}.replay`,
        payload: row.payload,
        status: "pending",
        attempts: 0,
        next_attempt_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Event re-enqueued for replay");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replay failed");
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pushed":
        return (
          <Badge variant="outline" className="border-success/40 text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Pushed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "awaiting_credentials":
        return (
          <Badge variant="outline" className="border-warning/40 text-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Awaiting creds
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-info/40 text-info">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cable className="h-4 w-4" />
              Oracle ERP Cloud Hand-off
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Delegation/approval events automatically push to Oracle ERP every 5 minutes.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Run sync now
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`text-left rounded-lg border p-3 transition-colors ${
                filter === "pending" ? "border-info bg-info/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold">{counts.pending}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter("pushed")}
              className={`text-left rounded-lg border p-3 transition-colors ${
                filter === "pushed" ? "border-success bg-success/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="text-xs text-muted-foreground">Pushed</div>
              <div className="text-2xl font-bold text-success">{counts.pushed}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter("failed")}
              className={`text-left rounded-lg border p-3 transition-colors ${
                filter === "failed"
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-destructive">{counts.failed}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter("awaiting_credentials")}
              className={`text-left rounded-lg border p-3 transition-colors ${
                filter === "awaiting_credentials"
                  ? "border-warning bg-warning/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="text-xs text-muted-foreground">Awaiting creds</div>
              <div className="text-2xl font-bold text-warning">{counts.awaiting_credentials}</div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
                <TabsTrigger value="awaiting_credentials">Awaiting</TabsTrigger>
                <TabsTrigger value="pushed">Pushed</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-xs text-muted-foreground">
              Showing {filtered.length} of last {rows.length}
            </span>
          </div>

          <div>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-muted-foreground py-6">
                <Inbox className="h-4 w-4 mr-2" />
                {filter === "all" ? "No ERP events yet." : `No events in "${filter}".`}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((r) => {
                  const canRetry = r.status === "failed" || r.status === "awaiting_credentials";
                  const canReplay = r.status === "pushed";
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 text-xs border border-border rounded px-3 py-2 hover:bg-muted/30"
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        {statusBadge(r.status)}
                        <span className="font-mono truncate">{r.entity_type}</span>
                        <span className="text-muted-foreground">· {r.event_type}</span>
                        {r.attempts > 1 && (
                          <span className="text-warning">· {r.attempts} attempts</span>
                        )}
                      </button>
                      <div className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(r.pushed_at ?? r.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                      {canRetry && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={busyId === r.id || running}
                          onClick={() => retryItem(r)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      {canReplay && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={busyId === r.id}
                          onClick={() => replayItem(r)}
                        >
                          <Repeat className="h-3 w-3 mr-1" />
                          Replay
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {counts.awaiting_credentials > 0 && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded p-3">
              <strong>Configure Oracle ERP credentials</strong> — set{" "}
              <code>ORACLE_ERP_BASE_URL</code>, <code>ORACLE_ERP_USERNAME</code>, and{" "}
              <code>ORACLE_ERP_PASSWORD</code> in backend secrets, then click{" "}
              <em>Run sync now</em> to release queued events.
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Cable className="h-4 w-4" />
              ERP Event Detail
            </SheetTitle>
            <SheetDescription>
              {selected?.entity_type} · {selected?.event_type}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="mt-1">{statusBadge(selected.status)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Attempts</div>
                    <div className="font-mono mt-1">{selected.attempts}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div className="font-mono mt-1">
                      {new Date(selected.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pushed</div>
                    <div className="font-mono mt-1">
                      {selected.pushed_at
                        ? new Date(selected.pushed_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  {selected.next_attempt_at && selected.status !== "pushed" && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Next attempt</div>
                      <div className="font-mono mt-1">
                        {new Date(selected.next_attempt_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selected.response_code !== null && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Response code</div>
                      <div className="font-mono mt-1">{selected.response_code}</div>
                    </div>
                  )}
                </div>

                {selected.last_error && (
                  <div>
                    <div className="text-muted-foreground mb-1">Last error</div>
                    <pre className="bg-destructive/10 border border-destructive/30 text-destructive rounded p-2 whitespace-pre-wrap break-all">
                      {selected.last_error}
                    </pre>
                  </div>
                )}

                {selected.response_body && (
                  <div>
                    <div className="text-muted-foreground mb-1">Response body</div>
                    <pre className="bg-muted/40 border border-border rounded p-2 whitespace-pre-wrap break-all max-h-48 overflow-auto">
                      {selected.response_body}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-muted-foreground mb-1">Payload</div>
                  <pre className="bg-muted/40 border border-border rounded p-2 whitespace-pre-wrap break-all max-h-64 overflow-auto">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-2 pt-2">
                  {(selected.status === "failed" ||
                    selected.status === "awaiting_credentials") && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={busyId === selected.id || running}
                      onClick={() => retryItem(selected)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry now
                    </Button>
                  )}
                  {selected.status === "pushed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === selected.id}
                      onClick={() => replayItem(selected)}
                    >
                      <Repeat className="h-4 w-4 mr-2" />
                      Replay event
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
