import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, BatteryCharging } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "./TablePagination";
import { useState, useMemo } from "react";

interface EVChargingReportTableProps {
  sessions: any[];
  view?: "sessions" | "state" | "cost";
}

export const EVChargingReportTable = ({ sessions, view = "sessions" }: EVChargingReportTableProps) => {
  const [page, setPage] = useState(1);
  const perPage = 20;

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/20 text-green-500";
      case "charging": return "bg-blue-500/20 text-blue-500";
      case "failed": return "bg-red-500/20 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // For "state" view - aggregate by vehicle
  const vehicleStateData = useMemo(() => {
    if (view !== "state") return [];
    const map = new Map<string, {
      plate: string;
      totalSessions: number;
      totalKwh: number;
      avgSocStart: number;
      avgSocEnd: number;
      lastSession: string;
      avgDuration: number;
    }>();

    sessions.forEach((s: any) => {
      const plate = s.vehicle?.plate_number || "Unknown";
      const existing = map.get(plate) || {
        plate,
        totalSessions: 0,
        totalKwh: 0,
        avgSocStart: 0,
        avgSocEnd: 0,
        lastSession: "",
        avgDuration: 0,
      };
      existing.totalSessions += 1;
      existing.totalKwh += Number(s.energy_consumed_kwh) || 0;
      existing.avgSocStart += Number(s.soc_start_percent) || 0;
      existing.avgSocEnd += Number(s.soc_end_percent) || 0;
      if (s.start_time > existing.lastSession) existing.lastSession = s.start_time;
      if (s.start_time && s.end_time) {
        existing.avgDuration += (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
      }
      map.set(plate, existing);
    });

    return Array.from(map.values()).map(v => ({
      ...v,
      avgSocStart: v.totalSessions > 0 ? (v.avgSocStart / v.totalSessions).toFixed(0) : "—",
      avgSocEnd: v.totalSessions > 0 ? (v.avgSocEnd / v.totalSessions).toFixed(0) : "—",
      avgDuration: v.totalSessions > 0 ? (v.avgDuration / v.totalSessions).toFixed(0) : "—",
    }));
  }, [sessions, view]);

  // For "cost" view - aggregate costs
  const costData = useMemo(() => {
    if (view !== "cost") return [];
    const map = new Map<string, {
      plate: string;
      sessions: number;
      totalKwh: number;
      totalCost: number;
      avgCostPerKwh: number;
    }>();

    sessions.forEach((s: any) => {
      const plate = s.vehicle?.plate_number || "Unknown";
      const existing = map.get(plate) || { plate, sessions: 0, totalKwh: 0, totalCost: 0, avgCostPerKwh: 0 };
      existing.sessions += 1;
      existing.totalKwh += Number(s.energy_consumed_kwh) || 0;
      existing.totalCost += Number(s.total_cost) || 0;
      map.set(plate, existing);
    });

    return Array.from(map.values()).map(v => ({
      ...v,
      avgCostPerKwh: v.totalKwh > 0 ? (v.totalCost / v.totalKwh).toFixed(2) : "—",
    })).sort((a, b) => b.totalCost - a.totalCost);
  }, [sessions, view]);

  const displayData = view === "sessions" ? sessions : view === "state" ? vehicleStateData : costData;
  const paged = displayData.slice((page - 1) * perPage, page * perPage);

  const totals = useMemo(() => ({
    kwh: sessions.reduce((s: number, sess: any) => s + (Number(sess.energy_consumed_kwh) || 0), 0),
    cost: sessions.reduce((s: number, sess: any) => s + (Number(sess.total_cost) || 0), 0),
    count: sessions.length,
  }), [sessions]);

  const emptyIcon = view === "sessions" ? Zap : BatteryCharging;
  const EmptyIcon = emptyIcon;

  if (displayData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <EmptyIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No EV Charging Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No charging sessions found for this period</p>
        </CardContent>
      </Card>
    );
  }

  const title = view === "sessions" ? "EV Charging Sessions" : view === "state" ? "Charge State by Vehicle" : "EV Charging Cost Analysis";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-emerald-500" />
            {title} ({displayData.length})
          </CardTitle>
          <div className="flex gap-3 text-xs">
            <Badge variant="outline" className="gap-1">⚡ {totals.kwh.toFixed(1)} kWh</Badge>
            <Badge variant="outline" className="gap-1">💰 {totals.cost.toFixed(2)}</Badge>
            <Badge variant="outline" className="gap-1">{totals.count} sessions</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {view === "sessions" && (
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Station</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">kWh</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">SOC Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">SOC End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost/kWh</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">{format(new Date(s.start_time), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3 font-medium">{s.vehicle?.plate_number || "—"}</td>
                    <td className="px-4 py-3 text-sm">{s.station_name || "—"}</td>
                    <td className="px-4 py-3 capitalize text-sm">{s.charging_type || "—"}</td>
                    <td className="px-4 py-3 font-mono font-medium">{s.energy_consumed_kwh?.toFixed(1) || "—"}</td>
                    <td className="px-4 py-3 font-mono">{s.soc_start_percent != null ? `${s.soc_start_percent}%` : "—"}</td>
                    <td className="px-4 py-3 font-mono">{s.soc_end_percent != null ? `${s.soc_end_percent}%` : "—"}</td>
                    <td className="px-4 py-3 font-mono">{s.cost_per_kwh?.toFixed(2) || "—"}</td>
                    <td className="px-4 py-3 font-mono">{s.total_cost?.toFixed(2) || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor(s.status)}>{s.status || "—"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === "state" && (
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total kWh</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg SOC Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg SOC End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg Duration (min)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Charged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((v: any, i: number) => (
                  <tr key={v.plate + i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{v.plate}</td>
                    <td className="px-4 py-3">{v.totalSessions}</td>
                    <td className="px-4 py-3 font-mono">{v.totalKwh.toFixed(1)}</td>
                    <td className="px-4 py-3 font-mono">{v.avgSocStart}%</td>
                    <td className="px-4 py-3 font-mono">{v.avgSocEnd}%</td>
                    <td className="px-4 py-3 font-mono">{v.avgDuration}</td>
                    <td className="px-4 py-3 text-sm">{v.lastSession ? format(new Date(v.lastSession), "MMM d, yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === "cost" && (
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total kWh</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg Cost/kWh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((v: any, i: number) => (
                  <tr key={v.plate + i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{v.plate}</td>
                    <td className="px-4 py-3">{v.sessions}</td>
                    <td className="px-4 py-3 font-mono">{v.totalKwh.toFixed(1)}</td>
                    <td className="px-4 py-3 font-mono font-medium">{v.totalCost.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono">{v.avgCostPerKwh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {displayData.length > perPage && (
          <div className="p-4 border-t">
            <TablePagination currentPage={page} totalItems={displayData.length} itemsPerPage={perPage} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
