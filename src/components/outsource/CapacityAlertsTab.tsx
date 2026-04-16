import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, CheckCircle2, X } from "lucide-react";
import { useOutsourceCapacity } from "@/hooks/useOutsourceCapacity";
import { format } from "date-fns";

const SEVERITY_COLOR: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "secondary", medium: "outline", high: "default", critical: "destructive",
};

export function CapacityAlertsTab() {
  const { alerts, isLoading, acknowledge, resolve, runAnalysis } = useOutsourceCapacity();

  const open = alerts.filter(a => a.status === "open" || a.status === "acknowledged");
  const resolved = alerts.filter(a => a.status === "resolved" || a.status === "dismissed");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Capacity Alerts (Vehicle / Driver)</CardTitle>
          <Button size="sm" onClick={() => runAnalysis.mutate({})} disabled={runAnalysis.isPending}>
            <RefreshCw className={`w-4 h-4 mr-1 ${runAnalysis.isPending ? "animate-spin" : ""}`} /> Run analysis
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}
          {!isLoading && open.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No open capacity issues. Click <strong>Run analysis</strong> to scan utilisation.</p>
          )}
          {open.map(a => (
            <div key={a.id} className="border rounded p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={SEVERITY_COLOR[a.severity]}>{a.severity}</Badge>
                  <Badge variant="outline">{a.alert_type.replace(/_/g, " ")}</Badge>
                  {a.zone_region && <Badge variant="secondary">{a.zone_region}</Badge>}
                  {a.utilization_pct != null && <span className="text-xs text-muted-foreground">Utilisation {a.utilization_pct}%</span>}
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PP p")}</span>
              </div>
              <p className="text-sm">{a.message}</p>
              {a.recommendation && <p className="text-xs text-muted-foreground italic">💡 {a.recommendation}</p>}
              <div className="flex gap-2">
                {a.status === "open" && <Button size="sm" variant="outline" onClick={() => acknowledge.mutate(a.id)}>Acknowledge</Button>}
                <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => resolve.mutate(a.id)}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Resolved ({resolved.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {resolved.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b pb-1">
                <span>{a.message}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PP")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
