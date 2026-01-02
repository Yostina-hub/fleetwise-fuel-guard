import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FuelTheftCase {
  id: string;
  detected_at: string;
  estimated_liters?: number;
  estimated_value?: number;
  status: string;
  notes?: string;
  vehicle?: { plate_number: string } | null;
}

interface FuelTheftTableProps {
  cases: FuelTheftCase[];
}

export const FuelTheftTable = ({ cases }: FuelTheftTableProps) => {
  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Theft Cases Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No fuel theft cases detected in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          Fuel Theft Cases ({cases.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Detected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Est. Liters</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Est. Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(c.detected_at), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.vehicle?.plate_number || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-red-500 font-medium">
                    {c.estimated_liters != null ? `${Number(c.estimated_liters).toFixed(1)} L` : "-"}
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    {c.estimated_value != null ? `$${Number(c.estimated_value).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      c.status === "confirmed" ? "bg-red-500/20 text-red-500" :
                      c.status === "investigating" ? "bg-amber-500/20 text-amber-600" :
                      c.status === "resolved" ? "bg-green-500/20 text-green-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                    {c.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
