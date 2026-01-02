import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface FuelTransaction {
  id: string;
  transaction_date: string;
  fuel_amount_liters: number;
  fuel_cost: number;
  fuel_price_per_liter: number;
  location_name: string;
  vendor_name: string;
  odometer_km: number;
  transaction_type: string;
  vehicle?: { plate_number: string };
}

interface FuelTransactionsTableProps {
  transactions: FuelTransaction[];
}

export const FuelTransactionsTable = ({ transactions }: FuelTransactionsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = transactions.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Fuel className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Fuel Transactions</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No fuel transactions recorded in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fuel className="w-5 h-5 text-primary" />
          Fuel Transactions ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Liters</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price/L</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(tx.transaction_date), "MMM dd, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {tx.vehicle?.plate_number || "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      tx.transaction_type === "refuel" ? "bg-green-500/20 text-green-600" :
                      tx.transaction_type === "card" ? "bg-blue-500/20 text-blue-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(tx.fuel_amount_liters).toFixed(1)} L</td>
                  <td className="px-4 py-3 font-medium text-amber-600">
                    ${Number(tx.fuel_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    ${Number(tx.fuel_price_per_liter || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {tx.location_name || tx.vendor_name || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.odometer_km ? `${Number(tx.odometer_km).toLocaleString()} km` : "-"}
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