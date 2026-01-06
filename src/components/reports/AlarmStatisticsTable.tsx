import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { TablePagination } from "./TablePagination";

interface Alert {
  id: string;
  alert_time: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  status?: string;
  vehicle_id?: string;
  vehicle?: { plate_number: string };
  driver?: { first_name: string; last_name: string };
  location_name?: string;
  lat?: number;
  lng?: number;
}

interface AlarmStatisticsTableProps {
  alerts: Alert[];
  filterType?: string; // Optional filter for specific alarm types
  title?: string;
}

export const AlarmStatisticsTable = ({ alerts, filterType, title = "Alarm Statistics" }: AlarmStatisticsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter alerts by type if specified
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    
    if (filterType) {
      result = result.filter(a => {
        const type = a.alert_type?.toLowerCase() || '';
        const alertTitle = a.title?.toLowerCase() || '';
        const filter = filterType.toLowerCase();
        
        // Match various alarm type patterns
        switch (filter) {
          case 'sos':
            return type.includes('sos') || type.includes('panic') || type.includes('emergency');
          case 'overspeed':
            return type.includes('speed') || type.includes('overspeed');
          case 'fatigue':
            return type.includes('fatigue') || type.includes('drowsy');
          case 'low_battery':
            return type.includes('battery') || type.includes('low_battery');
          case 'power_outage':
            return type.includes('power') || type.includes('disconnect');
          case 'vibration':
            return type.includes('vibration') || type.includes('shock');
          case 'door':
            return type.includes('door') || type.includes('open') || type.includes('close');
          case 'ignition':
            return type.includes('ignition') || type.includes('engine');
          case 'movement':
            return type.includes('movement') || type.includes('motion') || type.includes('tow');
          default:
            return type.includes(filter) || alertTitle.includes(filter);
        }
      });
    }
    
    return result.sort((a, b) => new Date(b.alert_time).getTime() - new Date(a.alert_time).getTime());
  }, [alerts, filterType]);

  // Chart data - count by type
  const chartData = useMemo(() => {
    const typeCounts = new Map<string, number>();
    
    filteredAlerts.forEach(alert => {
      const type = alert.alert_type || 'Unknown';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredAlerts]);

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    filteredAlerts.forEach(alert => {
      const severity = alert.severity?.toLowerCase() || 'low';
      if (severity === 'critical' || severity === 'error') counts.critical++;
      else if (severity === 'high' || severity === 'warning') counts.high++;
      else if (severity === 'medium') counts.medium++;
      else counts.low++;
    });
    
    return counts;
  }, [filteredAlerts]);

  const totalItems = filteredAlerts.length;
  const paginatedData = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase() || 'low';
    if (s === 'critical' || s === 'error') {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (s === 'high' || s === 'warning') {
      return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
    }
    if (s === 'medium') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium</Badge>;
    }
    return <Badge variant="secondary">Low</Badge>;
  };

  if (filteredAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No alarm data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{severityCounts.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High</p>
                <p className="text-2xl font-bold">{severityCounts.high}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Info className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medium</p>
                <p className="text-2xl font-bold">{severityCounts.medium}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Alarms</p>
                <p className="text-2xl font-bold">{filteredAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {!filterType && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alarms by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    type="category" 
                    dataKey="type" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium">{alert.vehicle?.plate_number || "Unknown"}</TableCell>
                  <TableCell>{format(parseISO(alert.alert_time), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{alert.alert_type || "-"}</Badge>
                  </TableCell>
                  <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        alert.status === 'resolved' 
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : alert.status === 'acknowledged'
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      }
                    >
                      {alert.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {alert.location_name || (alert.lat && alert.lng ? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}` : "-")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};
