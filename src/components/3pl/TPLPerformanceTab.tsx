import { useState } from "react";
import { useTPLPerformance, useTPLPartners } from "@/hooks/use3PL";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const emptyMetricForm = {
  partner_id: "", period_start: "", period_end: "",
  total_shipments: "", on_time_deliveries: "", late_deliveries: "",
  damaged_shipments: "", lost_shipments: "", customer_complaints: "",
  total_cost: "", avg_transit_hours: "", notes: "",
};

export function TPLPerformanceTab() {
  const { metrics, isLoading, createMetric } = useTPLPerformance();
  const { partners } = useTPLPartners();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyMetricForm);

  const handleSubmit = () => {
    if (!form.partner_id || !form.period_start || !form.period_end) return;
    const total = parseInt(form.total_shipments || "0");
    const onTime = parseInt(form.on_time_deliveries || "0");
    const damaged = parseInt(form.damaged_shipments || "0");
    const totalCost = parseFloat(form.total_cost || "0");

    const payload = {
      partner_id: form.partner_id,
      period_start: form.period_start,
      period_end: form.period_end,
      total_shipments: total || null,
      on_time_deliveries: onTime || null,
      late_deliveries: parseInt(form.late_deliveries || "0") || null,
      damaged_shipments: damaged || null,
      lost_shipments: parseInt(form.lost_shipments || "0") || null,
      customer_complaints: parseInt(form.customer_complaints || "0") || null,
      total_cost: totalCost || null,
      avg_transit_hours: parseFloat(form.avg_transit_hours || "0") || null,
      on_time_percentage: total > 0 ? Math.round((onTime / total) * 100) : null,
      damage_rate: total > 0 ? Math.round((damaged / total) * 100 * 10) / 10 : null,
      cost_per_shipment: total > 0 ? Math.round(totalCost / total) : null,
      overall_score: total > 0 ? Math.min(100, Math.round(
        (onTime / total) * 70 + (1 - damaged / total) * 20 + (form.customer_complaints ? Math.max(0, 10 - parseInt(form.customer_complaints)) : 10)
      )) : null,
      notes: form.notes || null,
    };
    createMetric.mutate(payload, { onSuccess: () => { setShowDialog(false); setForm(emptyMetricForm); } });
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const partnerMetrics = new Map<string, any>();
  metrics.forEach(m => {
    const existing = partnerMetrics.get(m.partner_id);
    if (!existing || new Date(m.period_start) > new Date(existing.period_start)) {
      partnerMetrics.set(m.partner_id, m);
    }
  });

  const latestMetrics = Array.from(partnerMetrics.values());
  const avgOnTime = latestMetrics.length > 0
    ? latestMetrics.reduce((s, m) => s + (m.on_time_percentage || 0), 0) / latestMetrics.length : 0;
  const totalShipments = latestMetrics.reduce((s, m) => s + (m.total_shipments || 0), 0);
  const avgScore = latestMetrics.length > 0
    ? latestMetrics.reduce((s, m) => s + (m.overall_score || 0), 0) / latestMetrics.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Avg On-Time</div>
              <div className="text-2xl font-bold">{avgOnTime.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4" /> Total Shipments</div>
              <div className="text-2xl font-bold">{totalShipments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Active Partners</div>
              <div className="text-2xl font-bold">{partners.filter(p => p.status === "active").length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="h-4 w-4" /> Avg Score</div>
              <div className="text-2xl font-bold">{avgScore.toFixed(1)}/100</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setForm(emptyMetricForm); setShowDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Record Metrics
        </Button>
      </div>

      {latestMetrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No performance data yet. Record metrics for your 3PL partners.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestMetrics.map(m => {
              const partner = partners.find(p => p.id === m.partner_id);
              return (
                <Card key={m.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{partner?.name || "Unknown"}</CardTitle>
                      <Badge variant={(m.overall_score || 0) >= 80 ? "default" : "secondary"}>
                        Score: {m.overall_score || 0}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.period_start} → {m.period_end}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>On-Time Delivery</span>
                        <span className="font-medium">{m.on_time_percentage || 0}%</span>
                      </div>
                      <Progress value={m.on_time_percentage || 0} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><div className="text-muted-foreground">Shipments</div><div className="font-medium">{m.total_shipments || 0}</div></div>
                      <div><div className="text-muted-foreground">Damage Rate</div><div className="font-medium">{m.damage_rate || 0}%</div></div>
                      <div><div className="text-muted-foreground">Avg Transit</div><div className="font-medium">{m.avg_transit_hours ? `${m.avg_transit_hours}h` : "-"}</div></div>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Cost/Shipment</span>
                      <span className="font-medium">{m.cost_per_shipment ? `${m.cost_per_shipment} ETB` : "-"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">All Performance Records</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Shipments</TableHead>
                  <TableHead>On-Time %</TableHead>
                  <TableHead>Damage Rate</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{(m as any).tpl_partners?.name || "-"}</TableCell>
                    <TableCell className="text-sm">{m.period_start} → {m.period_end}</TableCell>
                    <TableCell>{m.total_shipments}</TableCell>
                    <TableCell>{m.on_time_percentage}%</TableCell>
                    <TableCell>{m.damage_rate}%</TableCell>
                    <TableCell>{(m.total_cost || 0).toLocaleString()} ETB</TableCell>
                    <TableCell>
                      <Badge variant={(m.overall_score || 0) >= 80 ? "default" : (m.overall_score || 0) >= 60 ? "secondary" : "destructive"}>
                        {m.overall_score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Record Metrics Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Performance Metrics</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Partner *</Label>
              <Select value={form.partner_id} onValueChange={v => setForm({...form, partner_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Period Start *</Label><Input type="date" value={form.period_start} onChange={e => setForm({...form, period_start: e.target.value})} /></div>
              <div><Label>Period End *</Label><Input type="date" value={form.period_end} onChange={e => setForm({...form, period_end: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Total Shipments</Label><Input type="number" value={form.total_shipments} onChange={e => setForm({...form, total_shipments: e.target.value})} /></div>
              <div><Label>On-Time</Label><Input type="number" value={form.on_time_deliveries} onChange={e => setForm({...form, on_time_deliveries: e.target.value})} /></div>
              <div><Label>Late</Label><Input type="number" value={form.late_deliveries} onChange={e => setForm({...form, late_deliveries: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Damaged</Label><Input type="number" value={form.damaged_shipments} onChange={e => setForm({...form, damaged_shipments: e.target.value})} /></div>
              <div><Label>Lost</Label><Input type="number" value={form.lost_shipments} onChange={e => setForm({...form, lost_shipments: e.target.value})} /></div>
              <div><Label>Complaints</Label><Input type="number" value={form.customer_complaints} onChange={e => setForm({...form, customer_complaints: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Total Cost (ETB)</Label><Input type="number" value={form.total_cost} onChange={e => setForm({...form, total_cost: e.target.value})} /></div>
              <div><Label>Avg Transit (hours)</Label><Input type="number" value={form.avg_transit_hours} onChange={e => setForm({...form, avg_transit_hours: e.target.value})} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMetric.isPending}>Record Metrics</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
