import { useTPLPerformance, useTPLPartners } from "@/hooks/use3PL";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export function TPLPerformanceTab() {
  const { metrics, isLoading } = useTPLPerformance();
  const { partners } = useTPLPartners();

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  // Aggregate per partner (latest period)
  const partnerMetrics = new Map<string, any>();
  metrics.forEach(m => {
    const existing = partnerMetrics.get(m.partner_id);
    if (!existing || new Date(m.period_start) > new Date(existing.period_start)) {
      partnerMetrics.set(m.partner_id, m);
    }
  });

  const latestMetrics = Array.from(partnerMetrics.values());
  const avgOnTime = latestMetrics.length > 0
    ? latestMetrics.reduce((s, m) => s + (m.on_time_percentage || 0), 0) / latestMetrics.length
    : 0;
  const totalShipments = latestMetrics.reduce((s, m) => s + (m.total_shipments || 0), 0);
  const avgScore = latestMetrics.length > 0
    ? latestMetrics.reduce((s, m) => s + (m.overall_score || 0), 0) / latestMetrics.length
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Partner Scorecards */}
      {latestMetrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No performance data yet. Metrics are recorded per partner per period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Partner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestMetrics.map(m => {
              const partner = partners.find(p => p.id === m.partner_id);
              const scoreColor = (m.overall_score || 0) >= 80 ? "text-success" : (m.overall_score || 0) >= 60 ? "text-warning" : "text-destructive";
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
                      <div>
                        <div className="text-muted-foreground">Shipments</div>
                        <div className="font-medium">{m.total_shipments || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Damage Rate</div>
                        <div className="font-medium">{m.damage_rate || 0}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Transit</div>
                        <div className="font-medium">{m.avg_transit_hours ? `${m.avg_transit_hours}h` : "-"}</div>
                      </div>
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

          {/* Detailed Table */}
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
    </div>
  );
}
