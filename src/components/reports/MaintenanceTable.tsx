import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { format, isPast, isFuture, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface MaintenanceSchedule {
  id: string;
  service_type: string;
  interval_type: string;
  interval_value: number;
  next_due_date: string;
  next_due_odometer: number;
  last_service_date: string;
  priority: string;
  is_active: boolean;
  vehicle?: { plate_number: string; make: string; model: string };
}

interface MaintenanceTableProps {
  schedules: MaintenanceSchedule[];
}

const getStatusInfo = (nextDueDate: string | null) => {
  if (!nextDueDate) return { status: "scheduled", color: "muted", icon: Clock };
  
  const dueDate = new Date(nextDueDate);
  const now = new Date();
  const warningDate = addDays(now, 7);
  
  if (isPast(dueDate)) {
    return { status: "overdue", color: "destructive", icon: AlertCircle };
  } else if (dueDate <= warningDate) {
    return { status: "due soon", color: "amber", icon: Clock };
  } else {
    return { status: "scheduled", color: "green", icon: CheckCircle };
  }
};

export const MaintenanceTable = ({ schedules }: MaintenanceTableProps) => {
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Wrench className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Maintenance Schedules</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No active maintenance schedules found
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by next due date (overdue first)
  const sortedSchedules = [...schedules].sort((a, b) => {
    if (!a.next_due_date) return 1;
    if (!b.next_due_date) return -1;
    return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="w-5 h-5 text-primary" />
          Maintenance Schedules ({schedules.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Service Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Interval</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Next Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedSchedules.map((schedule) => {
                const statusInfo = getStatusInfo(schedule.next_due_date);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <tr key={schedule.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{schedule.vehicle?.plate_number || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.vehicle?.make} {schedule.vehicle?.model}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium capitalize">
                      {schedule.service_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {schedule.interval_value} {schedule.interval_type}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {schedule.next_due_date 
                        ? format(new Date(schedule.next_due_date), "MMM dd, yyyy")
                        : "-"
                      }
                      {schedule.next_due_odometer && (
                        <div className="text-xs text-muted-foreground">
                          or {Number(schedule.next_due_odometer).toLocaleString()} km
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn(
                          "w-4 h-4",
                          statusInfo.color === "destructive" ? "text-destructive" :
                          statusInfo.color === "amber" ? "text-amber-500" :
                          statusInfo.color === "green" ? "text-green-500" :
                          "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium capitalize",
                          statusInfo.color === "destructive" ? "bg-destructive/20 text-destructive" :
                          statusInfo.color === "amber" ? "bg-amber-500/20 text-amber-600" :
                          statusInfo.color === "green" ? "bg-green-500/20 text-green-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {statusInfo.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        schedule.priority === "high" ? "bg-red-500/20 text-red-600" :
                        schedule.priority === "medium" ? "bg-amber-500/20 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {schedule.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {schedule.last_service_date 
                        ? format(new Date(schedule.last_service_date), "MMM dd, yyyy")
                        : "Never"
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
