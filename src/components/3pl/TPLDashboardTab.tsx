import { useTPLPartners, useTPLShipments, useTPLInvoices, useTPLPerformance } from "@/hooks/use3PL";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Truck, FileText, TrendingUp, DollarSign, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export function TPLDashboardTab() {
  const { partners, isLoading: loadingPartners } = useTPLPartners();
  const { shipments, isLoading: loadingShipments } = useTPLShipments();
  const { invoices, isLoading: loadingInvoices } = useTPLInvoices();
  const { metrics } = useTPLPerformance();

  const isLoading = loadingPartners || loadingShipments || loadingInvoices;

  if (isLoading) return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const activePartners = partners.filter(p => p.status === "active").length;
  const pendingShipments = shipments.filter(s => s.status === "pending").length;
  const inTransit = shipments.filter(s => s.status === "in_transit").length;
  const delivered = shipments.filter(s => s.status === "delivered").length;
  const totalShipments = shipments.length;

  const pendingInvoiceAmount = invoices.filter(i => i.status === "pending").reduce((s, i) => s + (i.total_amount || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
  const paidAmount = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);

  const totalShipmentCost = shipments.reduce((s, sh) => s + (sh.actual_cost || sh.estimated_cost || 0), 0);

  // Latest performance per partner
  const latestMetrics = new Map<string, any>();
  metrics.forEach(m => {
    const existing = latestMetrics.get(m.partner_id);
    if (!existing || new Date(m.period_start) > new Date(existing.period_start)) {
      latestMetrics.set(m.partner_id, m);
    }
  });
  const avgOnTime = latestMetrics.size > 0
    ? Array.from(latestMetrics.values()).reduce((s, m) => s + (m.on_time_percentage || 0), 0) / latestMetrics.size
    : 0;

  // Recent shipments
  const recentShipments = shipments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" /> Active Partners</div>
            <div className="text-2xl font-bold">{activePartners}</div>
            <p className="text-xs text-muted-foreground">{partners.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4" /> In Transit</div>
            <div className="text-2xl font-bold">{inTransit}</div>
            <p className="text-xs text-muted-foreground">{pendingShipments} pending, {delivered} delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="h-4 w-4" /> Pending Billing</div>
            <div className="text-2xl font-bold text-warning">{pendingInvoiceAmount.toLocaleString()} ETB</div>
            <p className="text-xs text-muted-foreground">{overdueInvoices} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Avg On-Time</div>
            <div className="text-2xl font-bold">{avgOnTime.toFixed(1)}%</div>
            <Progress value={avgOnTime} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipment Pipeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Shipment Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Pending", count: pendingShipments, color: "bg-muted-foreground" },
              { label: "Picked Up", count: shipments.filter(s => s.status === "picked_up").length, color: "bg-primary" },
              { label: "In Transit", count: inTransit, color: "bg-primary" },
              { label: "Delivered", count: delivered, color: "bg-success" },
              { label: "Cancelled/Returned", count: shipments.filter(s => ["cancelled", "returned"].includes(s.status)).length, color: "bg-destructive" },
            ].map(stage => (
              <div key={stage.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <span className="text-sm">{stage.label}</span>
                </div>
                <span className="font-medium text-sm">{stage.count}</span>
              </div>
            ))}
            {totalShipments > 0 && (
              <div className="pt-2 border-t text-sm text-muted-foreground">
                Total: {totalShipments} shipments · {totalShipmentCost.toLocaleString()} ETB
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" /> Paid</div>
              <span className="font-medium text-sm text-success">{paidAmount.toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-warning" /> Pending</div>
              <span className="font-medium text-sm text-warning">{pendingInvoiceAmount.toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> Overdue</div>
              <span className="font-medium text-sm text-destructive">{overdueInvoices} invoices</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invoiced</span>
                <span className="font-medium">{invoices.reduce((s, i) => s + (i.total_amount || 0), 0).toLocaleString()} ETB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Shipments */}
      {recentShipments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Shipments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentShipments.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-mono text-sm">{s.shipment_number}</span>
                    <span className="text-sm text-muted-foreground ml-2">{(s as any).tpl_partners?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.actual_cost && <span className="text-sm">{s.actual_cost} ETB</span>}
                    <Badge variant={s.status === "delivered" ? "default" : s.status === "in_transit" ? "secondary" : "outline"}>
                      {s.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
