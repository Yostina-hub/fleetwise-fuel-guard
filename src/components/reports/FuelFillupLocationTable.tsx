import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { TablePagination } from "./TablePagination";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FuelFillupLocationTableProps {
  transactions: any[];
}

export const FuelFillupLocationTable = ({ transactions }: FuelFillupLocationTableProps) => {
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Only show transactions that have location data
  const withLocation = transactions.filter((t: any) => t.lat && t.lng || t.location_name);
  const totalPages = Math.ceil(withLocation.length / perPage);
  const paged = withLocation.slice((page - 1) * perPage, page * perPage);

  if (withLocation.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Location Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">No fuel fillup events with location data found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-primary" />
          Fuel Fillup Locations ({withLocation.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date/Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Coordinates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Receipt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Map</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((t: any) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">{format(new Date(t.transaction_date), "MMM d, yyyy HH:mm")}</td>
                  <td className="px-4 py-3 font-medium">{t.vehicle?.plate_number || "—"}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">{t.location_name || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {t.lat && t.lng ? `${Number(t.lat).toFixed(4)}, ${Number(t.lng).toFixed(4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{t.vendor_name || "—"}</td>
                  <td className="px-4 py-3 font-mono font-medium">{t.fuel_amount_liters?.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono">{t.fuel_cost?.toFixed(2) || "—"}</td>
                  <td className="px-4 py-3 text-sm">{t.odometer_km ? `${t.odometer_km.toLocaleString()} km` : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.receipt_number || "—"}</td>
                  <td className="px-4 py-3">
                    {t.lat && t.lng ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 gap-1"
                        onClick={() => window.open(`https://www.google.com/maps?q=${t.lat},${t.lng}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Button>
                    ) : "—"}
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
