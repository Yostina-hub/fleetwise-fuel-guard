/**
 * OLA Compliance Dashboard (CxQMD)
 * --------------------------------
 * Monthly / quarterly view of vehicle-request SLA performance.
 * - Filter by date window and group-by axis (operation type / pool / division)
 * - Aggregated KPIs: total, on-time, breached, compliance %, avg assignment time
 * - CSV export for handover to Customer Experience & Quality Management Division
 * - Lists open breach escalations
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Activity, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { useOlaCompliance, type OlaGroupBy } from "@/hooks/useOlaCompliance";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from "date-fns";

type Window = "this_month" | "last_month" | "this_quarter";

function rangeForWindow(w: Window): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (w === "last_month") {
    const last = subMonths(now, 1);
    return { start: startOfMonth(last), end: endOfMonth(last), label: format(last, "MMMM yyyy") };
  }
  if (w === "this_quarter") {
    return { start: startOfQuarter(now), end: endOfQuarter(now), label: `Q${Math.floor(now.getMonth()/3)+1} ${now.getFullYear()}` };
  }
  return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, "MMMM yyyy") };
}

const BUCKET_LABEL: Record<string, string> = {
  incident_urgent: "🚨 Incident / Urgent",
  daily_operation: "Daily Operation",
  field_work: "Field Work",
  project_work: "Project Work",
};

export default function OlaCompliance() {
  const [windowKey, setWindowKey] = useState<Window>("this_month");
  const [groupBy, setGroupBy] = useState<OlaGroupBy>("operation_type");
  const range = useMemo(() => rangeForWindow(windowKey), [windowKey]);
  const { rows, loading } = useOlaCompliance(range.start, range.end, groupBy);
  const { organizationId } = useOrganization();
  const [escalations, setEscalations] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from("ola_breach_escalations")
      .select("id, request_id, reason, status, created_at, resolved_at, vehicle_requests(request_number, requester_name)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setEscalations(data ?? []));
  }, [organizationId, range.start.getTime()]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const on_time = rows.reduce((s, r) => s + Number(r.on_time), 0);
    const breached = rows.reduce((s, r) => s + Number(r.breached), 0);
    const pct = total > 0 && (on_time + breached) > 0
      ? Math.round((on_time / (on_time + breached)) * 1000) / 10
      : null;
    return { total, on_time, breached, pct };
  }, [rows]);

  const exportCsv = () => {
    const header = ["Bucket","Total","On time","Breached","Compliance %","Avg assignment (min)"];
    const body = rows.map(r => [r.bucket, r.total, r.on_time, r.breached, r.compliance_pct ?? "", r.avg_assignment_minutes ?? ""]);
    const csv = [header, ...body].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OLA-compliance-${range.label.replace(/\s+/g,"-")}-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            OLA Compliance — {range.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vehicle Request Management OLA (FMG-FMG 01) — performance reporting for CxQMD.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={windowKey} onValueChange={(v) => setWindowKey(v as Window)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="last_month">Last month</SelectItem>
              <SelectItem value="this_quarter">This quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as OlaGroupBy)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="operation_type">By operation type</SelectItem>
              <SelectItem value="pool_name">By pool</SelectItem>
              <SelectItem value="division">By division</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total requests</div>
          <div className="text-2xl font-bold mt-1">{totals.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> On time</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{totals.on_time}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Breached</div>
          <div className="text-2xl font-bold mt-1 text-destructive">{totals.breached}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Compliance %</div>
          <div className="text-2xl font-bold mt-1">
            {totals.pct == null ? "—" : `${totals.pct}%`}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="escalations">
            Escalations
            {escalations.filter(e => e.status === "open").length > 0 && (
              <Badge variant="destructive" className="ml-2">{escalations.filter(e => e.status === "open").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ola_doc"><FileText className="h-3 w-3 mr-1" />OLA Document</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === "operation_type" ? "Operation type" : groupBy === "pool_name" ? "Pool" : "Division"}</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">On time</TableHead>
                  <TableHead className="text-right">Breached</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                  <TableHead className="text-right">Avg min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
                {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No requests in this window.</TableCell></TableRow>}
                {rows.map(r => (
                  <TableRow key={r.bucket}>
                    <TableCell className="font-medium">{BUCKET_LABEL[r.bucket] ?? r.bucket}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{r.on_time}</TableCell>
                    <TableCell className="text-right text-destructive">{r.breached}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.compliance_pct == null ? "—" :
                        <Badge variant={Number(r.compliance_pct) >= 90 ? "default" : Number(r.compliance_pct) >= 70 ? "secondary" : "destructive"}>
                          {r.compliance_pct}%
                        </Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {r.avg_assignment_minutes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="escalations">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No escalations recorded.</TableCell></TableRow>}
                {escalations.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.vehicle_requests?.request_number ?? "—"}</TableCell>
                    <TableCell>{e.vehicle_requests?.requester_name ?? "—"}</TableCell>
                    <TableCell className="max-w-md truncate">{e.reason}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "open" ? "destructive" : e.status === "resolved" ? "default" : "secondary"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="ola_doc">
          <Card className="p-6 space-y-4 text-sm">
            <h2 className="text-lg font-semibold">OLA — Vehicle Request Management</h2>
            <p className="text-muted-foreground">Process reference: <span className="font-mono">FMG-FMG 01</span> · Owner: Facilities &amp; Fleet Division (FFD) · Effective June 2019</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded border p-3"><div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-destructive" /> Incident / Urgent</div><div className="text-2xl font-bold mt-1">10 min</div></div>
              <div className="rounded border p-3"><div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Daily operation</div><div className="text-2xl font-bold mt-1">30 min</div></div>
              <div className="rounded border p-3"><div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Field work</div><div className="text-2xl font-bold mt-1">1.5 days</div></div>
              <div className="rounded border p-3"><div className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Project</div><div className="text-2xl font-bold mt-1">30 days</div></div>
            </div>
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/10 p-3">
              <strong>NB rule:</strong> If the requester has not used an assigned vehicle within <strong>1 hour</strong> of allocation, fleet management may auto-release the vehicle for other use. This system enforces it automatically every 2 minutes.
            </div>
            <p className="text-xs text-muted-foreground">Working window: Mon–Sat, 8:30 AM – 5:30 PM (Saturday half-day for daily ops).</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
