import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Zap, Fuel, ShieldCheck, MapPin, Download, Filter, FileText,
  Battery, Droplet, Clock, TrendingUp, CheckCircle2, XCircle,
  AlertTriangle, BarChart3, Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const FuelComprehensiveReportsTab = () => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [reportTab, setReportTab] = useState("fillup");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicleFilter, setVehicleFilter] = useState("all");

  const getPlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "—";
  const getDriverName = (id?: string | null) => {
    if (!id) return "—";
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  // Fuel fillup (refuel events with location)
  const { data: fillups = [] } = useQuery({
    queryKey: ["fuel-fillup-report", organizationId, dateFrom, dateTo, vehicleFilter],
    queryFn: async () => {
      let q = supabase.from("fuel_events").select("*")
        .eq("organization_id", organizationId!)
        .eq("event_type", "refuel")
        .gte("event_time", dateFrom)
        .lte("event_time", dateTo + "T23:59:59")
        .order("event_time", { ascending: false });
      if (vehicleFilter !== "all") q = q.eq("vehicle_id", vehicleFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fuel transactions (full liter report)
  const { data: txns = [] } = useQuery({
    queryKey: ["fuel-txn-report", organizationId, dateFrom, dateTo, vehicleFilter],
    queryFn: async () => {
      let q = supabase.from("fuel_transactions").select("*")
        .eq("organization_id", organizationId!)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo + "T23:59:59")
        .order("transaction_date", { ascending: false });
      if (vehicleFilter !== "all") q = q.eq("vehicle_id", vehicleFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fuel clearance/authorization (fuel requests)
  const { data: clearances = [] } = useQuery({
    queryKey: ["fuel-clearance-report", organizationId, dateFrom, dateTo, vehicleFilter],
    queryFn: async () => {
      let q = supabase.from("fuel_requests").select("*")
        .eq("organization_id", organizationId!)
        .gte("requested_at", dateFrom)
        .lte("requested_at", dateTo + "T23:59:59")
        .order("requested_at", { ascending: false });
      if (vehicleFilter !== "all") q = q.eq("vehicle_id", vehicleFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // EV charging sessions (kW/charge, charge state)
  const { data: evSessions = [] } = useQuery({
    queryKey: ["ev-charging-report", organizationId, dateFrom, dateTo, vehicleFilter],
    queryFn: async () => {
      let q = (supabase as any).from("ev_charging_sessions").select("*")
        .eq("organization_id", organizationId!)
        .gte("start_time", dateFrom)
        .lte("start_time", dateTo + "T23:59:59")
        .order("start_time", { ascending: false });
      if (vehicleFilter !== "all") q = q.eq("vehicle_id", vehicleFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalLiters = txns.reduce((s, t: any) => s + (t.fuel_amount_liters || 0), 0);
    const totalCost = txns.reduce((s, t: any) => s + (t.fuel_cost || 0), 0);
    const totalKWh = evSessions.reduce((s: number, e: any) => s + (e.energy_consumed_kwh || 0), 0);
    const totalEvCost = evSessions.reduce((s: number, e: any) => s + (e.total_cost || 0), 0);
    const approvedClearances = clearances.filter((c: any) => c.status === "approved" || c.status === "fulfilled").length;
    const rejectedClearances = clearances.filter((c: any) => c.status === "rejected").length;
    return { totalLiters, totalCost, totalKWh, totalEvCost, approvedClearances, rejectedClearances, fillupCount: fillups.length, evSessionCount: evSessions.length };
  }, [txns, evSessions, clearances, fillups]);

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map(row => headers.map(h => {
      const val = row[h];
      return typeof val === "string" && val.includes(",") ? `"${val}"` : (val ?? "");
    }));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      fulfilled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
    return <Badge variant="outline" className={`text-[10px] ${colors[status] || ""}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Droplet className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground">Total Liters</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Zap className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalKWh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
              <p className="text-[10px] text-muted-foreground">Total kWh Charged</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><ShieldCheck className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.approvedClearances}/{clearances.length}</p>
              <p className="text-[10px] text-muted-foreground">Clearances Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><MapPin className="w-5 h-5 text-purple-400" /></div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.fillupCount}</p>
              <p className="text-[10px] text-muted-foreground">Fill-up Events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-strong">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[130px]">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1 min-w-[130px]">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1 min-w-[160px] flex-1">
              <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="flex w-full overflow-x-auto lg:w-auto lg:inline-flex">
          <TabsTrigger value="fillup" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" />Fill-up & Location</TabsTrigger>
          <TabsTrigger value="liter" className="gap-1.5 text-xs"><Droplet className="w-3.5 h-3.5" />Fuel/Liter Report</TabsTrigger>
          <TabsTrigger value="clearance" className="gap-1.5 text-xs"><ShieldCheck className="w-3.5 h-3.5" />Clearance Auth</TabsTrigger>
          <TabsTrigger value="ev" className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />kW/Charge & State</TabsTrigger>
        </TabsList>

        {/* Fill-up Location Report */}
        <TabsContent value="fillup" className="mt-4">
          <Card className="glass-strong overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Fuel Fill-up Online Location Report</CardTitle>
                <CardDescription className="text-xs">All refuel events with GPS coordinates and location details</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(fillups, "fillup_report.csv", ["event_time", "vehicle_id", "fuel_change_liters", "fuel_before_liters", "fuel_after_liters", "location_name", "lat", "lng", "confidence_score", "status"])}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date/Time</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Liters Added</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Before</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">After</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Coords</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Confidence</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fillups.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No fill-up events in selected period</td></tr>
                  ) : fillups.map((f: any) => (
                    <tr key={f.id} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="px-3 py-2 whitespace-nowrap">{format(new Date(f.event_time), "MMM dd, yyyy HH:mm")}</td>
                      <td className="px-3 py-2 font-medium">{getPlate(f.vehicle_id)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-400">+{f.fuel_change_liters?.toFixed(1)}L</td>
                      <td className="px-3 py-2 text-right">{f.fuel_before_liters?.toFixed(1) ?? "—"}L</td>
                      <td className="px-3 py-2 text-right">{f.fuel_after_liters?.toFixed(1) ?? "—"}L</td>
                      <td className="px-3 py-2">{f.location_name || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {f.lat && f.lng ? (
                          <a href={`https://maps.google.com/?q=${f.lat},${f.lng}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {f.confidence_score != null ? (
                          <Badge variant="outline" className={`text-[9px] ${f.confidence_score >= 0.8 ? "text-emerald-400" : f.confidence_score >= 0.5 ? "text-amber-400" : "text-destructive"}`}>
                            {(f.confidence_score * 100).toFixed(0)}%
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">{statusBadge(f.status || "confirmed")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Fuel/Liter Report */}
        <TabsContent value="liter" className="mt-4">
          <Card className="glass-strong overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Fuel Per Liter Full Report</CardTitle>
                <CardDescription className="text-xs">Complete fuel transaction log with cost, vendor, odometer, and reconciliation</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(txns, "fuel_liter_report.csv", ["transaction_date", "vehicle_id", "fuel_amount_liters", "fuel_cost", "fuel_price_per_liter", "vendor_name", "location_name", "odometer_km", "card_number", "is_reconciled"])}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Liters</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price/L</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total Cost</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Odometer</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Card #</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Reconciled</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No transactions in selected period</td></tr>
                  ) : txns.map((t: any) => (
                    <tr key={t.id} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="px-3 py-2 whitespace-nowrap">{format(new Date(t.transaction_date), "MMM dd, yyyy")}</td>
                      <td className="px-3 py-2 font-medium">{getPlate(t.vehicle_id)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{t.fuel_amount_liters?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{t.fuel_price_per_liter?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{t.fuel_cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}</td>
                      <td className="px-3 py-2">{t.vendor_name || "—"}</td>
                      <td className="px-3 py-2">{t.location_name || "—"}</td>
                      <td className="px-3 py-2 text-right">{t.odometer_km?.toLocaleString() ?? "—"} km</td>
                      <td className="px-3 py-2">{t.card_number || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {t.is_reconciled ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {t.variance_liters != null ? (
                          <span className={t.variance_liters > 0 ? "text-amber-400" : t.variance_liters < 0 ? "text-destructive" : ""}>
                            {t.variance_liters > 0 ? "+" : ""}{t.variance_liters?.toFixed(1)}L
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fuel Clearance Authorization */}
        <TabsContent value="clearance" className="mt-4">
          <Card className="glass-strong overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Fuel Clearance & Authorization Report</CardTitle>
                <CardDescription className="text-xs">Fuel request approvals, rejections, and fulfillment tracking</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(clearances, "fuel_clearance_report.csv", ["request_number", "requested_at", "vehicle_id", "fuel_type", "liters_requested", "liters_approved", "estimated_cost", "actual_cost", "status", "purpose"])}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Request #</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fuel Type</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Requested (L)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Approved (L)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Est. Cost</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Actual Cost</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {clearances.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No fuel clearance requests in selected period</td></tr>
                  ) : clearances.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="px-3 py-2 font-mono text-primary">{c.request_number}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{format(new Date(c.requested_at), "MMM dd, yyyy")}</td>
                      <td className="px-3 py-2 font-medium">{getPlate(c.vehicle_id)}</td>
                      <td className="px-3 py-2 capitalize">{c.fuel_type || "—"}</td>
                      <td className="px-3 py-2 text-right">{c.liters_requested?.toFixed(1) ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{c.liters_approved?.toFixed(1) ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{c.estimated_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{c.actual_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{statusBadge(c.status)}</td>
                      <td className="px-3 py-2 truncate max-w-[150px]">{c.purpose || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EV kW/Charge & Charge State */}
        <TabsContent value="ev" className="mt-4">
          <Card className="glass-strong overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">EV Charging — kW/Charge & Charge State Report</CardTitle>
                <CardDescription className="text-xs">Energy consumption per session, SOC before/after, charging type, cost, and station location</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(evSessions, "ev_charging_report.csv", ["start_time", "end_time", "vehicle_id", "energy_consumed_kwh", "soc_start_percent", "soc_end_percent", "charging_type", "cost_per_kwh", "total_cost", "station_name", "lat", "lng", "status"])}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Start Time</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">kWh</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">SOC Start</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">SOC End</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Δ SOC</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost/kWh</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total Cost</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Station</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {evSessions.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No EV charging sessions in selected period</td></tr>
                  ) : evSessions.map((e: any) => {
                    const duration = e.start_time && e.end_time
                      ? Math.round((new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 60000)
                      : null;
                    const socDelta = e.soc_start_percent != null && e.soc_end_percent != null
                      ? e.soc_end_percent - e.soc_start_percent : null;
                    return (
                      <tr key={e.id} className="border-b border-border/10 hover:bg-muted/10">
                        <td className="px-3 py-2 whitespace-nowrap">{format(new Date(e.start_time), "MMM dd, HH:mm")}</td>
                        <td className="px-3 py-2 font-medium">{getPlate(e.vehicle_id)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-400">{e.energy_consumed_kwh?.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">
                          {e.soc_start_percent != null ? (
                            <div className="flex items-center justify-center gap-1">
                              <Battery className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{e.soc_start_percent}%</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.soc_end_percent != null ? (
                            <div className="flex items-center justify-center gap-1">
                              <Battery className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-semibold">{e.soc_end_percent}%</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {socDelta != null ? (
                            <Badge variant="outline" className="text-[9px] text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                              +{socDelta}%
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline" className="text-[9px]">{e.charging_type || "AC"}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{e.cost_per_kwh?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{e.total_cost?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-2">{e.station_name || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {e.lat && e.lng ? (
                            <a href={`https://maps.google.com/?q=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px]">
                              📍 Map
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {duration != null ? (
                            <span className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FuelComprehensiveReportsTab;
