import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Leaf, TrendingDown, BarChart3, Droplets, Plus, Loader2, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PageDateRangeProvider, usePageDateRange } from "@/contexts/PageDateRangeContext";
import PageDateRangeFilter from "@/components/common/PageDateRangeFilter";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#6366f1", "#f59e0b", "#10b981"];

const CarbonEmissionsInner = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const { startISO, endISO } = usePageDateRange();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", co2_kg: 0, fuel_consumed_liters: 0, distance_km: 0, emission_source: "fuel_combustion", period_start: "", period_end: "", offset_credits: 0, notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Date-aware: KPI cards, charts, tables all reflect the selected range.
  const { data: emissions = [], isLoading } = useQuery({
    queryKey: ["carbon-emissions", organizationId, startISO, endISO],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("carbon_emissions")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .gte("period_start", startISO)
        .lte("period_start", endISO)
        .order("period_start", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("vehicles").select("id, plate_number, make, model").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const totalCO2 = emissions.reduce((s: number, e: any) => s + (e.co2_kg || 0), 0);
  const totalFuel = emissions.reduce((s: number, e: any) => s + (e.fuel_consumed_liters || 0), 0);
  const totalOffset = emissions.reduce((s: number, e: any) => s + (e.offset_credits || 0), 0);
  const netEmissions = totalCO2 - totalOffset;

  const chartData = emissions.slice(0, 12).reverse().map((e: any) => ({
    period: format(new Date(e.period_start), "MMM yy"),
    co2: Math.round(e.co2_kg || 0),
    fuel: Math.round(e.fuel_consumed_liters || 0),
  }));

  // Vehicle breakdown for pie chart
  const vehicleBreakdown = useMemo(() => {
    const map: Record<string, { name: string; co2: number }> = {};
    emissions.forEach((e: any) => {
      const key = e.vehicle_id;
      const name = e.vehicles?.plate_number || "Unknown";
      if (!map[key]) map[key] = { name, co2: 0 };
      map[key].co2 += e.co2_kg || 0;
    });
    return Object.values(map).sort((a, b) => b.co2 - a.co2).slice(0, 8);
  }, [emissions]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    emissions.forEach((e: any) => {
      const src = e.emission_source || "unknown";
      map[src] = (map[src] || 0) + (e.co2_kg || 0);
    });
    return Object.entries(map).map(([name, co2]) => ({ name: name.replace(/_/g, " "), co2: Math.round(co2) }));
  }, [emissions]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicle_id) e.vehicle_id = "Select a vehicle";
    if (form.co2_kg <= 0) e.co2_kg = "Must be > 0";
    if (!form.period_start) e.period_start = "Required";
    if (!form.period_end) e.period_end = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("carbon_emissions").insert({
        vehicle_id: form.vehicle_id,
        co2_kg: form.co2_kg,
        fuel_consumed_liters: form.fuel_consumed_liters || null,
        distance_km: form.distance_km || null,
        emission_source: form.emission_source,
        period_start: form.period_start,
        period_end: form.period_end,
        offset_credits: form.offset_credits || 0,
        notes: form.notes.trim() || null,
        organization_id: organizationId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Emission record added");
      qc.invalidateQueries({ queryKey: ["carbon-emissions"] });
      setAddOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t('carbonEmissions.title')}</h1><p className="text-muted-foreground">{t('carbonEmissions.totalEmissions')}</p></div>
        <Button onClick={() => { setForm({ vehicle_id: "", co2_kg: 0, fuel_consumed_liters: 0, distance_km: 0, emission_source: "fuel_combustion", period_start: "", period_end: "", offset_credits: 0, notes: "" }); setErrors({}); setAddOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
      </div>

      {/* Page-level date filter — drives KPIs, charts, and tables */}
      <PageDateRangeFilter hint={t('common.dateRange', 'filters records by period start')} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Leaf className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{(totalCO2 / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Total CO₂</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Droplets className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{totalFuel.toLocaleString()}L</p><p className="text-sm text-muted-foreground">Fuel Consumed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{(totalOffset / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Offset Credits</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{(netEmissions / 1000).toFixed(1)}t</p><p className="text-sm text-muted-foreground">Net Emissions</p></div></div></CardContent></Card>
      </div>

        <Tabs defaultValue="overview">
          <TabsList><TabsTrigger value="overview">{t('common.overview', 'Overview')}</TabsTrigger><TabsTrigger value="vehicles">{t('emissions.byVehicle', 'By Vehicle')}</TabsTrigger><TabsTrigger value="sources">{t('emissions.bySource', 'By Source')}</TabsTrigger><TabsTrigger value="details">{t('common.details', 'Details')}</TabsTrigger></TabsList>

          <TabsContent value="overview">
            <Card><CardHeader><CardTitle>Emissions Trend</CardTitle></CardHeader><CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="co2" fill="hsl(var(--primary))" name="CO₂ (kg)" /><Bar dataKey="fuel" fill="hsl(var(--muted-foreground))" name="Fuel (L)" /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">No emission data recorded yet</p>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="vehicles">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> CO₂ by Vehicle (Top 8)</CardTitle></CardHeader><CardContent>
              {vehicleBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart><Pie data={vehicleBreakdown} dataKey="co2" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {vehicleBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {vehicleBreakdown.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="font-medium">{v.name}</span></div>
                        <span className="font-bold">{(v.co2 / 1000).toFixed(2)}t</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-center text-muted-foreground py-12">No data</p>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card><CardHeader><CardTitle>Emissions by Source</CardTitle></CardHeader><CardContent>
              {sourceBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceBreakdown} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} /><Tooltip /><Bar dataKey="co2" fill="hsl(var(--primary))" name="CO₂ (kg)" /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">No data</p>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="details">
            <Card><Table>
              <TableHeader><TableRow><TableHead>{t('common.vehicle', 'Vehicle')}</TableHead><TableHead>Period</TableHead><TableHead>CO₂ (kg)</TableHead><TableHead>Fuel (L)</TableHead><TableHead>Distance (km)</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">{t('common.loading', 'Loading...')}</TableCell></TableRow> :
                emissions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow> :
                emissions.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.vehicles?.plate_number || "—"}</TableCell>
                    <TableCell>{format(new Date(e.period_start), "MMM dd")} – {format(new Date(e.period_end), "MMM dd, yy")}</TableCell>
                    <TableCell>{e.co2_kg?.toFixed(1)}</TableCell>
                    <TableCell>{e.fuel_consumed_liters?.toFixed(0)}</TableCell>
                    <TableCell>{e.distance_km?.toFixed(0) || "—"}</TableCell>
                    <TableCell className="capitalize">{e.emission_source?.replace(/_/g, " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Emission Record</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Vehicle *</Label>
                <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                  <SelectTrigger className={errors.vehicle_id ? "border-destructive" : ""}><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                </Select>
                {errors.vehicle_id && <p className="text-sm text-destructive mt-1">{errors.vehicle_id}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Period Start *</Label><Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} className={errors.period_start ? "border-destructive" : ""} /></div>
                <div><Label>Period End *</Label><Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} className={errors.period_end ? "border-destructive" : ""} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>CO₂ (kg) *</Label><Input type="number" min={0} value={form.co2_kg} onChange={e => setForm(p => ({ ...p, co2_kg: parseFloat(e.target.value) || 0 }))} className={errors.co2_kg ? "border-destructive" : ""} /></div>
                <div><Label>Fuel (L)</Label><Input type="number" min={0} value={form.fuel_consumed_liters} onChange={e => setForm(p => ({ ...p, fuel_consumed_liters: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Distance (km)</Label><Input type="number" min={0} value={form.distance_km} onChange={e => setForm(p => ({ ...p, distance_km: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('common.source', 'Source')}</Label>
                  <Select value={form.emission_source} onValueChange={v => setForm(p => ({ ...p, emission_source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fuel_combustion">Fuel Combustion</SelectItem>
                      <SelectItem value="idling">{t('common.idling', 'Idling')}</SelectItem>
                      <SelectItem value="cold_start">Cold Start</SelectItem>
                      <SelectItem value="ac_usage">AC Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Offset Credits (kg)</Label><Input type="number" min={0} value={form.offset_credits} onChange={e => setForm(p => ({ ...p, offset_credits: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => { if (validate()) addMutation.mutate(); }} disabled={addMutation.isPending}>{addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CarbonEmissions;
