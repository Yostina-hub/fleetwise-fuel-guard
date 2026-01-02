import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WorkOrder {
  id: string;
  work_order_number: string;
  work_type: string;
  service_description: string;
  service_category: string;
  status: string;
  priority: string;
  scheduled_date: string;
  completed_date: string;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  technician_name: string;
  vehicle?: { plate_number: string };
}

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "in_progress":
      return <Loader2 className="w-4 h-4 text-blue-500" />;
    case "pending":
    case "scheduled":
      return <Clock className="w-4 h-4 text-amber-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
};

export const WorkOrdersTable = ({ workOrders }: WorkOrdersTableProps) => {
  if (workOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Work Orders</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No work orders recorded in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-primary" />
          Work Orders ({workOrders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">WO Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Technician</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{wo.work_order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium max-w-xs truncate">{wo.service_description || wo.work_type}</div>
                    <div className="text-xs text-muted-foreground capitalize">{wo.service_category?.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{wo.vehicle?.plate_number || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(wo.status)}
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        wo.status === "completed" ? "bg-green-500/20 text-green-600" :
                        wo.status === "in_progress" ? "bg-blue-500/20 text-blue-600" :
                        wo.status === "pending" || wo.status === "scheduled" ? "bg-amber-500/20 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {wo.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      wo.priority === "high" || wo.priority === "critical" ? "bg-red-500/20 text-red-600" :
                      wo.priority === "medium" ? "bg-amber-500/20 text-amber-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {wo.scheduled_date 
                      ? format(new Date(wo.scheduled_date), "MMM dd, yyyy")
                      : "-"
                    }
                  </td>
                  <td className="px-4 py-3 text-sm">{wo.technician_name || "-"}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {wo.total_cost ? `$${Number(wo.total_cost).toFixed(2)}` : "-"}
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
