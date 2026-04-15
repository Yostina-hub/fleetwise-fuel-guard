import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, Plus, Edit, Trash2, Loader2, 
  Download, FileText, FileSpreadsheet, RefreshCw, Zap, Target, ArrowRight 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useReportData } from "@/hooks/useReportData";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { exportToPDF, exportToCSV, exportToExcel } from "@/lib/exportUtils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const KPI_CATEGORIES = ["fleet", "fuel", "safety", "maintenance", "compliance", "financial", "driver", "operations"];

const emptyKpi = { kpi_name: "", category: "fleet", target_value: 0, actual_value: 0, unit: "", trend: "stable", period_start: "", period_end: "" };

const KPIScorecard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyKpi);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live fleet metrics from the last 30 days
  const dateRange = useMemo(() => ({
    start: subDays(new Date(), 30),
    end: new Date(),
  }), []);

  const { metrics, loading: metricsLoading } = useReportData(dateRange);

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["kpi-scorecards", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from("kpi_scorecards").select("*").eq("organization_id", organizationId).order("category");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Auto-calculated KPIs from live fleet data
  const liveKpis = useMemo(() => {
    if (metricsLoading) return [];
    return [
      { id: "live-distance", kpi_name: "Total Distance Covered", category: "fleet", target_value: 50000, actual_value: Math.round(metrics.totalDistance), unit: "km", trend: metrics.distanceTrend > 0 ? "up" : metrics.distanceTrend < 0 ? "down" : "stable", is_live: true },
      { id: "live-trips", kpi_name: "Completed Trips", category: "fleet", target_value: 500, actual_value: metrics.completedTrips, unit: "trips", trend: metrics.tripsTrend > 0 ? "up" : metrics.tripsTrend < 0 ? "down" : "stable", is_live: true },
      { id: "live-efficiency", kpi_name: "Fuel Efficiency", category: "fuel", target_value: 12, actual_value: parseFloat(metrics.avgEfficiency.toFixed(1)), unit: "km/L", trend: metrics.efficiencyTrend > 0 ? "up" : metrics.efficiencyTrend < 0 ? "down" : "stable", is_live: true },
      { id: "live-fuel-cost", kpi_name: "Total Fuel Cost", category: "fuel", target_value: 500000, actual_value: Math.round(metrics.totalFuelCost), unit: "ETB", trend: metrics.fuelTrend > 0 ? "up" : "stable", is_live: true },
      { id: "live-fuel-theft", kpi_name: "Fuel Theft Incidents", category: "fuel", target_value: 0, actual_value: metrics.fuelTheftCount, unit: "cases", trend: metrics.fuelTheftCount > 0 ? "up" : "stable", is_live: true },
      { id: "live-safety", kpi_name: "Safety Score (Avg)", category: "safety", target_value: 85, actual_value: parseFloat(metrics.avgDriverScore.toFixed(1)), unit: "%", trend: metrics.safetyTrend < 0 ? "up" : metrics.safetyTrend > 0 ? "down" : "stable", is_live: true },
      { id: "live-speeding", kpi_name: "Speeding Events", category: "safety", target_value: 0, actual_value: metrics.speedingEvents, unit: "events", trend: metrics.speedingEvents > 0 ? "down" : "stable", is_live: true },
      { id: "live-alerts", kpi_name: "Critical Alerts", category: "safety", target_value: 0, actual_value: metrics.criticalAlerts, unit: "alerts", trend: metrics.criticalAlerts > 0 ? "down" : "stable", is_live: true },
      { id: "live-maint-overdue", kpi_name: "Overdue Maintenance", category: "maintenance", target_value: 0, actual_value: metrics.overdueMaintenance, unit: "items", trend: metrics.overdueMaintenance > 0 ? "down" : "stable", is_live: true },
      { id: "live-wo-completion", kpi_name: "Work Order Completion Rate", category: "maintenance", target_value: 95, actual_value: metrics.workOrdersTotal > 0 ? parseFloat(((metrics.workOrdersCompleted / metrics.workOrdersTotal) * 100).toFixed(1)) : 0, unit: "%", trend: "stable", is_live: true },
      { id: "live-dispatch-sla", kpi_name: "Dispatch SLA Met", category: "operations", target_value: 95, actual_value: parseFloat(metrics.slaMetPercentage.toFixed(1)), unit: "%", trend: metrics.slaMetPercentage >= 95 ? "up" : "down", is_live: true },
      { id: "live-inspection-pass", kpi_name: "Inspection Pass Rate", category: "compliance", target_value: 100, actual_value: metrics.inspectionsTotal > 0 ? parseFloat((((metrics.inspectionsTotal - metrics.inspectionsFailed) / metrics.inspectionsTotal) * 100).toFixed(1)) : 0, unit: "%", trend: "stable", is_live: true },
      { id: "live-total-costs", kpi_name: "Total Vehicle Costs", category: "financial", target_value: 1000000, actual_value: Math.round(metrics.totalVehicleCosts), unit: "ETB", trend: metrics.costTrend > 0 ? "up" : metrics.costTrend < 0 ? "down" : "stable", is_live: true },
      { id: "live-coaching", kpi_name: "Drivers Needing Coaching", category: "driver", target_value: 0, actual_value: metrics.driversNeedingCoaching, unit: "drivers", trend: metrics.driversNeedingCoaching > 0 ? "down" : "stable", is_live: true },
    ];
  }, [metrics, metricsLoading]);

  // Combine live + custom KPIs
  const allKpis = useMemo(() => [...liveKpis, ...kpis], [liveKpis, kpis]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.kpi_name.trim()) e.kpi_name = "Required";
    if (!form.period_start) e.period_start = "Required";
    if (!form.period_end) e.period_end = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, kpi_name: form.kpi_name.trim(), unit: form.unit.trim(), organization_id: organizationId! };
      if (editing) {
        const { error } = await supabase.from("kpi_scorecards").update(payload).eq("id", editing.id).eq("organization_id", organizationId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kpi_scorecards").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "KPI updated" : "KPI added"); qc.invalidateQueries({ queryKey: ["kpi-scorecards"] }); setDialogOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpi_scorecards").delete().eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("KPI deleted"); qc.invalidateQueries({ queryKey: ["kpi-scorecards"] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => { setEditing(null); setForm(emptyKpi); setErrors({}); setDialogOpen(true); };
  const openEdit = (k: any) => {
    setEditing(k);
    setForm({ kpi_name: k.kpi_name, category: k.category, target_value: k.target_value, actual_value: k.actual_value, unit: k.unit || "", trend: k.trend || "stable", period_start: k.period_start?.slice(0, 10) || "", period_end: k.period_end?.slice(0, 10) || "" });
    setErrors({});
    setDialogOpen(true);
  };

  const onTarget = allKpis.filter((k: any) => {
    // For "lower is better" KPIs (target = 0), on target means actual = 0
    if (k.target_value === 0) return k.actual_value === 0;
    return k.actual_value >= k.target_value;
  });

  const categories = [...new Set(allKpis.map((k: any) => k.category))];

  const trendIcon = (t: string) => {
    switch (t) { case "up": return <TrendingUp className="h-4 w-4 text-green-500" />; case "down": return <TrendingDown className="h-4 w-4 text-destructive" />; default: return <Minus className="h-4 w-4 text-muted-foreground" />; }
  };

  // Export all KPIs
  const handleExport = (type: "csv" | "pdf" | "excel") => {
    const exportData = allKpis.map((k: any) => ({
      kpi_name: k.kpi_name,
      category: k.category,
      target: `${k.target_value} ${k.unit || ""}`.trim(),
      actual: `${k.actual_value} ${k.unit || ""}`.trim(),
      progress: k.target_value > 0 ? `${Math.min(100, (k.actual_value / k.target_value) * 100).toFixed(1)}%` : "N/A",
      trend: k.trend || "stable",
      status: k.target_value === 0 ? (k.actual_value === 0 ? "On Target" : "Below") : (k.actual_value >= k.target_value ? "On Target" : k.actual_value >= k.target_value * 0.75 ? "Close" : "Below"),
      source: k.is_live ? "Auto-calculated" : "Manual",
    }));

    const columns = [
      { key: "kpi_name", label: "KPI Name", width: 55 },
      { key: "category", label: "Category", width: 30 },
      { key: "target", label: "Target", width: 30 },
      { key: "actual", label: "Actual", width: 30 },
      { key: "progress", label: "Progress", width: 25 },
      { key: "trend", label: "Trend", width: 20 },
      { key: "status", label: "Status", width: 25 },
      { key: "source", label: "Source", width: 30 },
    ];

    if (type === "csv") {
      exportToCSV(exportData, "kpi_scorecard_report");
      toast.success("KPI Scorecard exported to CSV");
    } else if (type === "pdf") {
      exportToPDF("KPI Scorecard Report", exportData, columns, "kpi_scorecard_report");
      toast.success("KPI Scorecard exported to PDF with Ethio Telecom branding");
    } else {
      exportToExcel("KPI Scorecard Report", exportData, columns, "kpi_scorecard_report");
      toast.success("KPI Scorecard exported to Excel");
    }
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["kpi-scorecards"] });
    qc.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith('report-');
    }});
    toast.success("Refreshing KPI data...");
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              {t('pages.k_p_i_scorecard.title', 'KPI Scorecards')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('pages.k_p_i_scorecard.description', 'Track key performance indicators and organizational targets')}
              <span className="text-xs ml-2 text-muted-foreground/70">• Last 30 days auto-calculated</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" /> Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')} className="gap-2">
              <ArrowRight className="h-4 w-4" /> Reports
            </Button>
            <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-2" /> Add KPI</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{allKpis.length}</p>
                  <p className="text-sm text-muted-foreground">Total KPIs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{onTarget.length}</p>
                  <p className="text-sm text-muted-foreground">On Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{allKpis.length - onTarget.length}</p>
                  <p className="text-sm text-muted-foreground">Below Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{liveKpis.length}</p>
                  <p className="text-sm text-muted-foreground">Auto-Calculated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Tables by Category */}
        {categories.map(cat => {
          const catKpis = allKpis.filter((k: any) => k.category === cat);
          return (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="capitalize flex items-center gap-2">
                  {cat} KPIs
                  <Badge variant="secondary" className="text-xs ml-2">{catKpis.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>{t('common.status', 'Status')}</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="w-24">{t('common.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catKpis.map((k: any) => {
                        const isLowerBetter = k.target_value === 0;
                        const pct = k.target_value > 0 ? Math.min(100, (k.actual_value / k.target_value) * 100) : (k.actual_value === 0 ? 100 : 0);
                        const isOnTarget = isLowerBetter ? k.actual_value === 0 : k.actual_value >= k.target_value;
                        const isClose = !isLowerBetter && pct >= 75;
                        return (
                          <TableRow key={k.id}>
                            <TableCell className="font-medium">{k.kpi_name}</TableCell>
                            <TableCell>{k.target_value.toLocaleString()} {k.unit}</TableCell>
                            <TableCell className="font-bold">{k.actual_value.toLocaleString()} {k.unit}</TableCell>
                            <TableCell className="w-32"><Progress value={pct} className="h-2" /></TableCell>
                            <TableCell>{trendIcon(k.trend)}</TableCell>
                            <TableCell>
                              <Badge variant={isOnTarget ? "default" : isClose ? "secondary" : "destructive"}>
                                {isOnTarget ? "On Target" : isClose ? "Close" : "Below"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {k.is_live ? (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Zap className="h-3 w-3" /> Live
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Manual</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {!k.is_live && (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(k)}><Edit className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this KPI?")) deleteMutation.mutate(k.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(isLoading || metricsLoading) && <Card><CardContent className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading KPIs...</CardContent></Card>}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit KPI" : "Add Custom KPI"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>KPI Name *</Label><Input value={form.kpi_name} onChange={e => setForm(p => ({ ...p, kpi_name: e.target.value }))} className={errors.kpi_name ? "border-destructive" : ""} />{errors.kpi_name && <p className="text-sm text-destructive mt-1">{errors.kpi_name}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('common.category', 'Category')}</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KPI_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.unit', 'Unit')}</Label><Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="%, km, L, etc." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Target Value</Label><Input type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Actual Value</Label><Input type="number" value={form.actual_value} onChange={e => setForm(p => ({ ...p, actual_value: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Period Start *</Label><Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} className={errors.period_start ? "border-destructive" : ""} /></div>
                <div><Label>Period End *</Label><Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} className={errors.period_end ? "border-destructive" : ""} /></div>
                <div><Label>{t('kpi.trend', 'Trend')}</Label>
                  <Select value={form.trend} onValueChange={v => setForm(p => ({ ...p, trend: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="up">{t('common.up', 'Up')}</SelectItem><SelectItem value="down">{t('common.down', 'Down')}</SelectItem><SelectItem value="stable">{t('common.stable', 'Stable')}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => { if (validate()) saveMutation.mutate(); }} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default KPIScorecard;
