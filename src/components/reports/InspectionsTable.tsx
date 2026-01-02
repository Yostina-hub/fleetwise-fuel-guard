import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Inspection {
  id: string;
  inspection_date: string;
  inspection_type: string;
  odometer_km: number;
  certified_safe: boolean;
  mechanic_notes: string | null;
  status: string;
  overall_condition: string | null;
  defects_found: unknown;
  vehicle?: { plate_number: string } | null;
}

interface InspectionsTableProps {
  inspections: Inspection[];
}

export const InspectionsTable = ({ inspections }: InspectionsTableProps) => {
  const passedCount = inspections.filter(i => i.certified_safe).length;
  const failedCount = inspections.filter(i => !i.certified_safe).length;
  const passRate = inspections.length > 0 ? (passedCount / inspections.length) * 100 : 0;

  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Inspections</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No vehicle inspections recorded in this period
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
            <div className="text-sm text-muted-foreground">Total Inspections</div>
            <div className="text-2xl font-bold text-foreground">{inspections.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Passed</div>
              <div className="text-2xl font-bold text-green-500">{passedCount}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500/30" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-red-500">{failedCount}</div>
            </div>
            <XCircle className="w-8 h-8 text-red-500/30" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Pass Rate</div>
            <div className={cn(
              "text-2xl font-bold",
              passRate >= 90 ? "text-green-500" :
              passRate >= 70 ? "text-amber-500" :
              "text-red-500"
            )}>
              {passRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Vehicle Inspections ({inspections.length})
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(inspection.inspection_date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {inspection.vehicle?.plate_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {inspection.inspection_type?.replace(/_/g, ' ') || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        inspection.status === "completed" ? "bg-green-500/20 text-green-600" :
                        inspection.status === "pending_repair" ? "bg-amber-500/20 text-amber-600" :
                        inspection.status === "in_progress" ? "bg-blue-500/20 text-blue-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {inspection.status?.replace(/_/g, ' ') || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inspection.odometer_km 
                        ? `${Number(inspection.odometer_km).toLocaleString()} km`
                        : "-"
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {inspection.certified_safe ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600">
                              Passed
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-600">
                              Failed
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        inspection.overall_condition === "good" ? "bg-green-500/20 text-green-600" :
                        inspection.overall_condition === "fair" ? "bg-amber-500/20 text-amber-600" :
                        inspection.overall_condition === "poor" ? "bg-red-500/20 text-red-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {inspection.overall_condition || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {inspection.mechanic_notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};