import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Cable, RefreshCw, AlertTriangle, CheckCircle2, Clock, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface OutboxRow {
  id: string;
  entity_type: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  pushed_at: string | null;
}

interface QueueCounts {
  pending: number;
  pushed: number;
  failed: number;
  awaiting_credentials: number;
}

/**
 * ERP Oracle outbox status card. Shows queue health, last 10 events,
 * and a manual "Run sync now" trigger. Read-only beyond the trigger button.
 */
export const ErpOracleQueueCard = () => {
  const { organizationId } = useOrganization();
  const [counts, setCounts] = useState<QueueCounts>({
    pending: 0,
    pushed: 0,
    failed: 0,
    awaiting_credentials: 0,
  });
  const [recent, setRecent] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const refresh = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [{ data: rows }, { data: latest }] = await Promise.all([
        supabase
          .from("erp_outbox")
          .select("status")
          .eq("organization_id", organizationId),
        supabase
          .from("erp_outbox")
          .select("id, entity_type, event_type, status, attempts, last_error, created_at, pushed_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const c: QueueCounts = {
        pending: 0,
        pushed: 0,
        failed: 0,
        awaiting_credentials: 0,
      };
      for (const r of rows || []) {
        const s = (r.status as keyof QueueCounts) ?? "pending";
        if (s in c) c[s]++;
      }
      setCounts(c);
      setRecent((latest as OutboxRow[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [organizationId]);

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

  const statusBadge = (status: string) => {
    switch (status) {
      case "pushed":
        return <Badge variant="outline" className="border-success/40 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Pushed</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-destructive/40 text-destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "awaiting_credentials":
        return <Badge variant="outline" className="border-warning/40 text-warning"><AlertTriangle className="h-3 w-3 mr-1" />Awaiting creds</Badge>;
      default:
        return <Badge variant="outline" className="border-info/40 text-info"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
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
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Pushed</div>
            <div className="text-2xl font-bold text-success">{counts.pushed}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-destructive">{counts.failed}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Awaiting creds</div>
            <div className="text-2xl font-bold text-warning">{counts.awaiting_credentials}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Recent events</div>
          {recent.length === 0 ? (
            <div className="flex items-center justify-center text-xs text-muted-foreground py-6">
              <Inbox className="h-4 w-4 mr-2" /> No ERP events yet.
            </div>
          ) : (
            <div className="space-y-1">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs border border-border rounded px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusBadge(r.status)}
                    <span className="font-mono truncate">{r.entity_type}</span>
                    <span className="text-muted-foreground">· {r.event_type}</span>
                    {r.attempts > 1 && (
                      <span className="text-warning">· {r.attempts} attempts</span>
                    )}
                  </div>
                  <div className="text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(r.pushed_at ?? r.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {counts.awaiting_credentials > 0 && (
          <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded p-3">
            <strong>Configure Oracle ERP credentials</strong> — set <code>ORACLE_ERP_BASE_URL</code>,{" "}
            <code>ORACLE_ERP_USERNAME</code>, and <code>ORACLE_ERP_PASSWORD</code> in backend secrets,
            then click <em>Run sync now</em> to release queued events.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
