import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface VehicleCost {
  id: string;
  cost_date: string;
  cost_type: string;
  category: string;
  description: string;
  amount: number;
  odometer_km: number;
  notes: string;
  vehicle?: { plate_number: string };
}

interface CostsTableProps {
  costs: VehicleCost[];
}

const getCostTypeColor = (costType: string) => {
  switch (costType?.toLowerCase()) {
    case "fuel":
      return "bg-amber-500/20 text-amber-600";
    case "maintenance":
      return "bg-blue-500/20 text-blue-600";
    case "repair":
      return "bg-red-500/20 text-red-600";
    case "insurance":
      return "bg-purple-500/20 text-purple-600";
    case "registration":
      return "bg-green-500/20 text-green-600";
    case "tolls":
      return "bg-cyan-500/20 text-cyan-600";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const CostsTable = ({ costs }: CostsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = costs.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCosts = costs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  
  // Group by cost type for summary
  const costsByType = costs.reduce((acc, cost) => {
    const type = cost.cost_type || "Other";
    acc[type] = (acc[type] || 0) + (Number(cost.amount) || 0);
    return acc;
  }, {} as Record<string, number>);

  if (costs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Cost Records</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No vehicle costs recorded in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Costs</div>
            <div className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        {Object.entries(costsByType).slice(0, 3).map(([type, amount]) => (
          <Card key={type} className="bg-card/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground capitalize">{type}</div>
              <div className="text-2xl font-bold text-foreground">${amount.toFixed(2)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Costs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-primary" />
            Vehicle Costs ({totalItems})
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(cost.cost_date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {cost.vehicle?.plate_number || "Fleet"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getCostTypeColor(cost.cost_type)
                      )}>
                        {cost.cost_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {cost.category?.replace(/_/g, ' ') || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">
                      {cost.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {cost.odometer_km ? `${Number(cost.odometer_km).toLocaleString()} km` : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-destructive">
                      ${Number(cost.amount).toFixed(2)}
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
    </div>
  );
};