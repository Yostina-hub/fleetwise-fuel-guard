import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface Alert {
  id: string;
  alert_time: string;
  title: string;
  message: string;
  alert_type: string;
  severity: string;
  status: string;
  location_name: string;
  vehicle?: { plate_number: string };
  driver?: { first_name: string; last_name: string };
}

interface AlertsTableProps {
  alerts: Alert[];
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
    case "high":
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case "medium":
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

export const AlertsTable = ({ alerts }: AlertsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = alerts.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAlerts = alerts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Alerts</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No alerts recorded in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-primary" />
          System Alerts ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(alert.alert_time), "MMM dd, HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        alert.severity === "critical" ? "bg-destructive/20 text-destructive" :
                        alert.severity === "high" ? "bg-red-500/20 text-red-600" :
                        alert.severity === "medium" ? "bg-amber-500/20 text-amber-600" :
                        "bg-blue-500/20 text-blue-600"
                      )}>
                        {alert.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{alert.title}</td>
                  <td className="px-4 py-3 text-sm capitalize">{alert.alert_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm">
                    {alert.vehicle?.plate_number || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      alert.status === "active" ? "bg-destructive/20 text-destructive" :
                      alert.status === "acknowledged" ? "bg-amber-500/20 text-amber-600" :
                      alert.status === "resolved" ? "bg-green-500/20 text-green-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {alert.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {alert.location_name || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
};