import { useState } from "react";
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
import { BarChart3, TrendingUp, TrendingDown, Minus, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";

import { useTranslation } from 'react-i18next';
const KPI_CATEGORIES = ["fleet", "fuel", "safety", "maintenance", "compliance", "financial", "driver", "operations"];

const emptyKpi = { kpi_name: "", category: "fleet", target_value: 0, actual_value: 0, unit: "", trend: "stable", period_start: "", period_end: "" };

const KPIScorecard = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyKpi);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const onTarget = kpis.filter((k: any) => k.actual_value >= k.target_value);
  const categories = [...new Set(kpis.map((k: any) => k.category))];

  const trendIcon = (t: string) => {
    switch (t) { case "up": return <TrendingUp className="h-4 w-4 text-green-500" />; case "down": return <TrendingDown className="h-4 w-4 text-destructive" />; default: return <Minus className="h-4 w-4 text-muted-foreground" />; }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">{t('pages.k_p_i_scorecard.title', 'KPI Scorecards')}</h1><p className="text-muted-foreground">{t('pages.k_p_i_scorecard.description', 'Track key performance indicators and organizational targets')}</p></div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add KPI</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{kpis.length}</p><p className="text-sm text-muted-foreground">Total KPIs</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{onTarget.length}</p><p className="text-sm text-muted-foreground">On Target</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{kpis.length - onTarget.length}</p><p className="text-sm text-muted-foreground">Below Target</p></div></div></CardContent></Card>
        </div>

        {categories.map(cat => (
          <Card key={cat}><CardHeader><CardTitle className="capitalize">{cat} KPIs</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow>
                <TableHead>KPI</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead><TableHead>Progress</TableHead><TableHead>Period</TableHead><TableHead>Trend</TableHead><TableHead>{t('common.status', 'Status')}</TableHead><TableHead className="w-24">{t('common.actions', 'Actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {kpis.filter((k: any) => k.category === cat).map((k: any) => {
                  const pct = k.target_value > 0 ? Math.min(100, (k.actual_value / k.target_value) * 100) : 0;
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.kpi_name}</TableCell>
                      <TableCell>{k.target_value} {k.unit}</TableCell>
                      <TableCell className="font-bold">{k.actual_value} {k.unit}</TableCell>
                      <TableCell className="w-32"><Progress value={pct} className="h-2" /></TableCell>
                      <TableCell className="text-sm">{format(new Date(k.period_start), "MMM dd")} - {format(new Date(k.period_end), "MMM dd")}</TableCell>
                      <TableCell>{trendIcon(k.trend)}</TableCell>
                      <TableCell><Badge variant={pct >= 100 ? "default" : pct >= 75 ? "secondary" : "destructive"}>{pct >= 100 ? "On Target" : pct >= 75 ? "Close" : "Below"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(k)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this KPI?")) deleteMutation.mutate(k.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ))}

        {isLoading && <Card><CardContent className="py-8 text-center">Loading KPIs...</CardContent></Card>}
        {!isLoading && kpis.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No KPIs configured yet. Click "Add KPI" to create one.</CardContent></Card>}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit KPI" : "Add KPI"}</DialogTitle></DialogHeader>
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
