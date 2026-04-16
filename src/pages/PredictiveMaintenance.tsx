import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, Activity, RefreshCw, Ban, Sparkles, Banknote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePredictiveMaintenance, type PredictiveScore } from "@/hooks/usePredictiveMaintenance";
import { formatDistanceToNow, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PredictionDetailDrawer } from "@/components/predictive/PredictionDetailDrawer";

const riskColor = (r: string): "default" | "secondary" | "destructive" | "outline" =>
  r === "critical" ? "destructive" : r === "high" ? "destructive" : r === "medium" ? "default" : "secondary";

const PredictiveMaintenance = () => {
  const { t } = useTranslation();
  const { predictions, snapshots, isLoading, runAnalysis, runHeuristicAnalysis, dismiss, createWorkOrder } = usePredictiveMaintenance();
  const [filter, setFilter] = useState<"all" | "open" | "actioned" | "dismissed">("open");
  const [selected, setSelected] = useState<PredictiveScore | null>(null);

  const filtered = predictions.filter((p) => (filter === "all" ? true : p.status === filter));

  const counts = {
    critical: predictions.filter((p) => p.risk_level === "critical" && p.status === "open").length,
    high: predictions.filter((p) => p.risk_level === "high" && p.status === "open").length,
    medium: predictions.filter((p) => p.risk_level === "medium" && p.status === "open").length,
    low: predictions.filter((p) => p.risk_level === "low").length,
  };
  const avgHealth = predictions.length
    ? (predictions.reduce((s, p) => s + p.health_score, 0) / predictions.length).toFixed(0)
    : "—";
  const totalCostExposure = predictions
    .filter((p) => p.status === "open")
    .reduce((s, p) => s + (Number(p.estimated_cost_impact_etb) || 0), 0);

  const lastRun = predictions.length
    ? predictions.reduce((latest, p) => (p.computed_at > latest ? p.computed_at : latest), predictions[0].computed_at)
    : null;

  const aiCount = predictions.filter((p) => p.analysis_method === "ai").length;

  const chartData = snapshots.map((s) => ({
    date: format(new Date(s.snapshot_date), "MMM d"),
    health: Number(s.avg_health_score),
    critical: s.critical_count,
    high: s.high_count,
  }));

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              {t("pages.predictive_maintenance.title", "AI Predictive Maintenance")}
              {aiCount > 0 && <Badge variant="default" className="ml-2"><Sparkles className="w-3 h-3 mr-1" />Live AI</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              Lovable AI analyzes telemetry, mileage, age, alerts & maintenance history per vehicle
              {lastRun && <> · last run {formatDistanceToNow(new Date(lastRun), { addSuffix: true })}</>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runHeuristicAnalysis.mutate()} disabled={runHeuristicAnalysis.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${runHeuristicAnalysis.isPending ? "animate-spin" : ""}`} />
              Quick scan
            </Button>
            <Button onClick={() => runAnalysis.mutate(10)} disabled={runAnalysis.isPending}>
              <Sparkles className={`h-4 w-4 mr-2 ${runAnalysis.isPending ? "animate-pulse" : ""}`} />
              {runAnalysis.isPending ? "AI analyzing…" : "Run AI analysis"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{avgHealth}%</p><p className="text-sm text-muted-foreground">Avg fleet health</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{counts.critical}</p><p className="text-sm text-muted-foreground">Critical risk</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{counts.high}</p><p className="text-sm text-muted-foreground">High risk</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{counts.low}</p><p className="text-sm text-muted-foreground">Healthy</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Banknote className="h-8 w-8 text-warning" /><div><p className="text-xl font-bold">{totalCostExposure.toLocaleString()} ETB</p><p className="text-sm text-muted-foreground">Cost exposure</p></div></div></CardContent></Card>
        </div>

        {chartData.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Fleet Health Trend (last 30 snapshots)</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="health" stroke="hsl(var(--primary))" name="Avg health %" strokeWidth={2} />
                  <Line type="monotone" dataKey="critical" stroke="hsl(var(--destructive))" name="Critical" />
                  <Line type="monotone" dataKey="high" stroke="hsl(var(--warning))" name="High" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {predictions.length === 0 && !isLoading && (
          <Card><CardContent className="py-12 text-center space-y-3">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No predictions yet. Click <strong>Run AI analysis</strong> to scan your fleet.</p>
          </CardContent></Card>
        )}

        {predictions.length > 0 && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="open">Open ({predictions.filter((p) => p.status === "open").length})</TabsTrigger>
              <TabsTrigger value="actioned">Actioned ({predictions.filter((p) => p.status === "actioned").length})</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed ({predictions.filter((p) => p.status === "dismissed").length})</TabsTrigger>
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
                      <TableHead>AI Confidence</TableHead>
                      <TableHead>Predicted failure</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No predictions in this view</TableCell></TableRow>
                    ) : filtered.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(p)}>
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
                        <TableCell className="text-sm">
                          {p.ai_confidence != null ? (
                            <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" />{Math.round(Number(p.ai_confidence))}%</Badge>
                          ) : <span className="text-xs text-muted-foreground">heuristic</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.predicted_failure_component ?? "—"}
                          {p.predicted_failure_window_days && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />~{p.predicted_failure_window_days}d</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.estimated_cost_impact_etb
                            ? <span className="font-mono">{Number(p.estimated_cost_impact_etb).toLocaleString()} ETB</span>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
            <p><strong>AI mode:</strong> Per-vehicle reasoning via Lovable AI Gateway (google/gemini-2.5-flash) using structured tool-calling. Each call analyzes telemetry alerts, overdue schedules, recent maintenance, mileage and age to predict the next failure component, repair cost (ETB), downtime, and confidence.</p>
            <p><strong>Quick scan:</strong> SQL heuristic — odometer tiers (80k/150k/250k), age tiers (3/6/10y), overdue maintenance, and high-severity alerts. Useful for instant org-wide baseline.</p>
            <p>Click any row to see full AI reasoning, component breakdown, and recommended parts.</p>
          </CardContent>
        </Card>
      </div>

      <PredictionDetailDrawer prediction={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </Layout>
  );
};

export default PredictiveMaintenance;
