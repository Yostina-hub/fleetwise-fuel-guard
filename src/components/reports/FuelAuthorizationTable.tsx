import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "./TablePagination";
import { useState } from "react";

interface FuelAuthorizationTableProps {
  requests: any[];
}

export const FuelAuthorizationTable = ({ requests }: FuelAuthorizationTableProps) => {
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.ceil(requests.length / perPage);
  const paged = requests.slice((page - 1) * perPage, page * perPage);

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-500/20 text-green-500";
      case "pending": return "bg-yellow-500/20 text-yellow-600";
      case "rejected": return "bg-red-500/20 text-red-500";
      case "fulfilled": return "bg-blue-500/20 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Fuel Authorization Records</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No fuel clearance requests found for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Fuel Clearance & Authorization ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Request #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Requested (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Approved (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Est. Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{r.request_number}</td>
                  <td className="px-4 py-3 text-sm">{format(new Date(r.requested_at), "MMM d, yyyy HH:mm")}</td>
                  <td className="px-4 py-3 font-medium">{r.vehicle?.plate_number || "—"}</td>
                  <td className="px-4 py-3">{r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : "—"}</td>
                  <td className="px-4 py-3 font-mono">{r.liters_requested?.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono">{r.liters_approved?.toFixed(1) || "—"}</td>
                  <td className="px-4 py-3 font-mono">{r.estimated_cost?.toFixed(2) || "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.fuel_type || "—"}</td>
                  <td className="px-4 py-3 text-sm">{r.purpose || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t">
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
