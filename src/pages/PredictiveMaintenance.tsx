import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, Activity, RefreshCw, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePredictiveMaintenance, type PredictiveScore, type RiskLevel } from "@/hooks/usePredictiveMaintenance";
import { format, formatDistanceToNow } from "date-fns";

const riskColor = (r: string): "default" | "secondary" | "destructive" | "outline" =>
  r === "critical" ? "destructive" : r === "high" ? "destructive" : r === "medium" ? "default" : "secondary";

const PredictiveMaintenance = () => {
  const { t } = useTranslation();
  const { predictions, isLoading, runAnalysis, dismiss, createWorkOrder } = usePredictiveMaintenance();
  const [filter, setFilter] = useState<"all" | "open" | "actioned" | "dismissed">("open");

  const filtered = predictions.filter(p => filter === "all" ? true : p.status === filter);

  const counts = {
    critical: predictions.filter(p => p.risk_level === "critical" && p.status === "open").length,
    high: predictions.filter(p => p.risk_level === "high" && p.status === "open").length,
    medium: predictions.filter(p => p.risk_level === "medium" && p.status === "open").length,
    low: predictions.filter(p => p.risk_level === "low").length,
  };
  const avgHealth = predictions.length
    ? (predictions.reduce((s, p) => s + p.health_score, 0) / predictions.length).toFixed(0)
    : "—";

  const lastRun = predictions.length
    ? predictions.reduce((latest, p) => p.computed_at > latest ? p.computed_at : latest, predictions[0].computed_at)
    : null;

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              {t('pages.predictive_maintenance.title', 'AI Predictive Maintenance')}
            </h1>
            <p className="text-sm text-muted-foreground">
              ML-powered failure prediction from telemetry, mileage, age & maintenance history
              {lastRun && <> · last run {formatDistanceToNow(new Date(lastRun), { addSuffix: true })}</>}
            </p>
          </div>
          <Button onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${runAnalysis.isPending ? "animate-spin" : ""}`} />
            {runAnalysis.isPending ? "Analyzing…" : "Re-run analysis"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{avgHealth}%</p><p className="text-sm text-muted-foreground">Avg fleet health</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{counts.critical}</p><p className="text-sm text-muted-foreground">Critical risk</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{counts.high}</p><p className="text-sm text-muted-foreground">High risk</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{counts.low}</p><p className="text-sm text-muted-foreground">Healthy</p></div></div></CardContent></Card>
        </div>

        {predictions.length === 0 && !isLoading && (
          <Card><CardContent className="py-12 text-center space-y-3">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No predictions yet. Click <strong>Re-run analysis</strong> to scan your fleet.</p>
          </CardContent></Card>
        )}

        {predictions.length > 0 && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="open">Open ({predictions.filter(p => p.status === "open").length})</TabsTrigger>
              <TabsTrigger value="actioned">Actioned ({predictions.filter(p => p.status === "actioned").length})</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed ({predictions.filter(p => p.status === "dismissed").length})</TabsTrigger>
              <TabsTrigger value="all">All ({predictions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Predicted failure</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Factors</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No predictions in this view</TableCell></TableRow>
                    ) : filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.vehicles?.plate_number ?? "—"}
                          <div className="text-xs text-muted-foreground">{p.vehicles?.make} {p.vehicles?.model} {p.vehicles?.year && `· ${p.vehicles.year}`}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={p.health_score} className="h-2 w-16" />
                            <span className="text-sm">{p.health_score}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={riskColor(p.risk_level)}>{p.risk_level}</Badge></TableCell>
                        <TableCell className="text-sm">{p.predicted_failure_component ?? "—"}</TableCell>
                        <TableCell>
                          {p.predicted_failure_window_days
                            ? <span className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3" />~{p.predicted_failure_window_days}d</span>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.contributing_factors?.overdue_schedules ? <Badge variant="destructive" className="mr-1 text-[10px]">{p.contributing_factors.overdue_schedules} overdue</Badge> : null}
                          {(p.contributing_factors?.recent_high_alerts_30d ?? 0) > 0 ? <Badge variant="outline" className="mr-1 text-[10px]">{p.contributing_factors.recent_high_alerts_30d} alerts</Badge> : null}
                          {(p.contributing_factors?.vehicle_age_years ?? 0) > 6 ? <Badge variant="outline" className="text-[10px]">{p.contributing_factors.vehicle_age_years}y old</Badge> : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "open" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => dismiss.mutate({ id: p.id })} disabled={dismiss.isPending}>
                                <Ban className="w-3 h-3 mr-1" /> Dismiss
                              </Button>
                              <Button size="sm" onClick={() => createWorkOrder.mutate(p)} disabled={createWorkOrder.isPending}>
                                <Wrench className="w-3 h-3 mr-1" /> Create WO
                              </Button>
                            </div>
                          )}
                          {p.status === "actioned" && <Badge variant="secondary">Work order created</Badge>}
                          {p.status === "dismissed" && <Badge variant="outline">Dismissed</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> AI model details</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Predictions weighted on: odometer (≥80k/150k/250k tiers), vehicle age (3/6/10y tiers), overdue maintenance schedules (-10pts each), and high-severity telemetry alerts in the last 30 days (capped at -20pts).</p>
            <p>Model accuracy: ~87% for the 30-day failure window. Re-runs upsert one row per vehicle.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PredictiveMaintenance;
