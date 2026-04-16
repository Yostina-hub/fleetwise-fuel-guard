import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Droplet, Zap, Fuel, MapPin, Download, TrendingUp, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

export default function AssetFuelHistoryTab() {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [assetFilter, setAssetFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"transactions" | "fillups" | "ev">("transactions");

  // Get fleet_assets linked to vehicles
  const { data: assets = [] } = useQuery({
    queryKey: ["fleet-assets-fuel", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_assets")
        .select("id, asset_code, name, vehicle_id, category")
        .eq("organization_id", organizationId!)
        .not("vehicle_id", "is", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const assetVehicleMap = useMemo(() => {
    const m: Record<string, { assetId: string; assetCode: string; assetName: string }> = {};
    for (const a of assets) {
      if (a.vehicle_id) m[a.vehicle_id] = { assetId: a.id, assetCode: a.asset_code, assetName: a.name };
    }
    return m;
  }, [assets]);

  const vehicleIds = useMemo(() => {
    if (assetFilter === "all") return assets.map((a: any) => a.vehicle_id).filter(Boolean);
    const a = assets.find((a: any) => a.id === assetFilter);
    return a?.vehicle_id ? [a.vehicle_id] : [];
  }, [assets, assetFilter]);

  // Fuel transactions
  const { data: txns = [], isLoading: txnLoading } = useQuery({
    queryKey: ["asset-fuel-txns", organizationId, dateFrom, dateTo, vehicleIds],
    queryFn: async () => {
      if (!vehicleIds.length) return [];
      let q = supabase.from("fuel_transactions").select("*")
        .eq("organization_id", organizationId!)
        .in("vehicle_id", vehicleIds)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo + "T23:59:59")
        .order("transaction_date", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && vehicleIds.length > 0,
  });

  // Fill-up events
  const { data: fillups = [] } = useQuery({
    queryKey: ["asset-fuel-fillups", organizationId, dateFrom, dateTo, vehicleIds],
    queryFn: async () => {
      if (!vehicleIds.length) return [];
      let q = supabase.from("fuel_events").select("*")
        .eq("organization_id", organizationId!)
        .eq("event_type", "refuel")
        .in("vehicle_id", vehicleIds)
        .gte("event_time", dateFrom)
        .lte("event_time", dateTo + "T23:59:59")
        .order("event_time", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && vehicleIds.length > 0,
  });

  // EV Charging
  const { data: evSessions = [] } = useQuery({
    queryKey: ["asset-ev-sessions", organizationId, dateFrom, dateTo, vehicleIds],
    queryFn: async () => {
      if (!vehicleIds.length) return [];
      let q = (supabase as any).from("ev_charging_sessions").select("*")
        .eq("organization_id", organizationId!)
        .in("vehicle_id", vehicleIds)
        .gte("start_time", dateFrom)
        .lte("start_time", dateTo + "T23:59:59")
        .order("start_time", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && vehicleIds.length > 0,
  });

  const getPlate = (vid: string) => vehicles.find(v => v.id === vid)?.plate_number || "—";
  const getAssetInfo = (vid: string) => assetVehicleMap[vid] || { assetCode: "—", assetName: "—" };

  const stats = useMemo(() => ({
    totalLiters: txns.reduce((s, t: any) => s + (t.fuel_amount_liters || 0), 0),
    totalCost: txns.reduce((s, t: any) => s + (t.fuel_cost || 0), 0),
    totalKWh: evSessions.reduce((s: number, e: any) => s + (e.energy_consumed_kwh || 0), 0),
    totalEvCost: evSessions.reduce((s: number, e: any) => s + (e.total_cost || 0), 0),
    fillupCount: fillups.length,
    evCount: evSessions.length,
    avgCostPerLiter: txns.length > 0
      ? txns.reduce((s, t: any) => s + (t.fuel_cost || 0), 0) / Math.max(txns.reduce((s, t: any) => s + (t.fuel_amount_liters || 0), 0), 1)
      : 0,
  }), [txns, evSessions, fillups]);

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

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/10"><Droplet className="w-4 h-4 text-amber-400" /></div>
            <div>
              <p className="text-xl font-bold">{stats.totalLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground">Total Liters</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/10"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
            <div>
              <p className="text-xl font-bold">{stats.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB</p>
              <p className="text-[10px] text-muted-foreground">Total Fuel Cost</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-500/10"><Zap className="w-4 h-4 text-blue-400" /></div>
            <div>
              <p className="text-xl font-bold">{stats.totalKWh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
              <p className="text-[10px] text-muted-foreground">Total kWh</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-purple-500/10"><MapPin className="w-4 h-4 text-purple-400" /></div>
            <div>
              <p className="text-xl font-bold">{stats.fillupCount + stats.evCount}</p>
              <p className="text-[10px] text-muted-foreground">Total Events</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1 min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Asset</label>
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {assets.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">View</label>
          <Select value={viewMode} onValueChange={v => setViewMode(v as any)}>
            <SelectTrigger className="h-9 text-xs w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transactions">Fuel Transactions</SelectItem>
              <SelectItem value="fillups">Fill-up Events</SelectItem>
              <SelectItem value="ev">EV Charging</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => {
          if (viewMode === "transactions") exportCSV(txns, "asset_fuel_transactions.csv", ["transaction_date", "vehicle_id", "fuel_amount_liters", "fuel_cost", "odometer_reading", "vendor_name"]);
          else if (viewMode === "fillups") exportCSV(fillups, "asset_fuel_fillups.csv", ["event_time", "vehicle_id", "fuel_before_percent", "fuel_after_percent", "confidence_score", "lat", "lng"]);
          else exportCSV(evSessions, "asset_ev_sessions.csv", ["start_time", "vehicle_id", "energy_consumed_kwh", "soc_start_percent", "soc_end_percent", "total_cost"]);
        }}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <ScrollArea className="max-h-[500px]">
          {viewMode === "transactions" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Cost (ETB)</TableHead>
                  <TableHead>Cost/Liter</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Vendor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txnLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : txns.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fuel transactions for linked assets</TableCell></TableRow>
                ) : txns.map((t: any) => {
                  const info = getAssetInfo(t.vehicle_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{format(new Date(t.transaction_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{info.assetCode}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{info.assetName}</p>
                      </TableCell>
                      <TableCell className="text-xs">{getPlate(t.vehicle_id)}</TableCell>
                      <TableCell className="text-xs font-semibold">{t.fuel_amount_liters?.toFixed(1)}</TableCell>
                      <TableCell className="text-xs font-semibold">{t.fuel_cost?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{t.fuel_amount_liters ? (t.fuel_cost / t.fuel_amount_liters).toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-xs">{t.odometer_reading?.toLocaleString() || "—"}</TableCell>
                      <TableCell className="text-xs">{t.vendor_name || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {viewMode === "fillups" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Before %</TableHead>
                  <TableHead>After %</TableHead>
                  <TableHead>Δ%</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fillups.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fill-up events</TableCell></TableRow>
                ) : fillups.map((f: any) => {
                  const info = getAssetInfo(f.vehicle_id);
                  const delta = (f.fuel_after_percent || 0) - (f.fuel_before_percent || 0);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{format(new Date(f.event_time), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{info.assetCode}</p>
                      </TableCell>
                      <TableCell className="text-xs">{getPlate(f.vehicle_id)}</TableCell>
                      <TableCell className="text-xs">{f.fuel_before_percent?.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs">{f.fuel_after_percent?.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs font-semibold text-success">+{delta.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {((f.confidence_score || 0) * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.lat && f.lng ? (
                          <a href={`https://maps.google.com/?q=${f.lat},${f.lng}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Map
                          </a>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {viewMode === "ev" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>kWh</TableHead>
                  <TableHead>SOC Start</TableHead>
                  <TableHead>SOC End</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost (ETB)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evSessions.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No EV charging sessions</TableCell></TableRow>
                ) : evSessions.map((e: any) => {
                  const info = getAssetInfo(e.vehicle_id);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{format(new Date(e.start_time), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{info.assetCode}</p>
                      </TableCell>
                      <TableCell className="text-xs">{getPlate(e.vehicle_id)}</TableCell>
                      <TableCell className="text-xs font-semibold">{e.energy_consumed_kwh?.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{e.soc_start_percent?.toFixed(0)}%</TableCell>
                      <TableCell className="text-xs">{e.soc_end_percent?.toFixed(0)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{e.charging_type || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{e.total_cost?.toLocaleString() || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </Card>

      {/* Per-Asset Fuel Cost Summary */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" /> Per-Asset Fuel Cost Summary
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Total Liters</TableHead>
                  <TableHead>Total Fuel Cost</TableHead>
                  <TableHead>Avg Cost/Liter</TableHead>
                  <TableHead>Total kWh</TableHead>
                  <TableHead>EV Cost</TableHead>
                  <TableHead>Combined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a: any) => {
                  const aTxns = txns.filter((t: any) => t.vehicle_id === a.vehicle_id);
                  const aEv = evSessions.filter((e: any) => e.vehicle_id === a.vehicle_id);
                  const liters = aTxns.reduce((s: number, t: any) => s + (t.fuel_amount_liters || 0), 0);
                  const fuelCost = aTxns.reduce((s: number, t: any) => s + (t.fuel_cost || 0), 0);
                  const kwh = aEv.reduce((s: number, e: any) => s + (e.energy_consumed_kwh || 0), 0);
                  const evCost = aEv.reduce((s: number, e: any) => s + (e.total_cost || 0), 0);
                  if (liters === 0 && kwh === 0) return null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{a.asset_code}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{a.name}</p>
                      </TableCell>
                      <TableCell className="text-xs">{getPlate(a.vehicle_id)}</TableCell>
                      <TableCell className="text-xs font-semibold">{liters.toFixed(0)}</TableCell>
                      <TableCell className="text-xs font-semibold">{fuelCost.toLocaleString()} ETB</TableCell>
                      <TableCell className="text-xs">{liters > 0 ? (fuelCost / liters).toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-xs">{kwh > 0 ? kwh.toFixed(1) : "—"}</TableCell>
                      <TableCell className="text-xs">{evCost > 0 ? `${evCost.toLocaleString()} ETB` : "—"}</TableCell>
                      <TableCell className="text-xs font-bold">{(fuelCost + evCost).toLocaleString()} ETB</TableCell>
                    </TableRow>
                  );
                }).filter(Boolean)}
                {assets.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">No assets linked to vehicles. Import vehicles from the Registry tab first.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
