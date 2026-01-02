import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface DispatchJob {
  id: string;
  job_number: string;
  job_type: string;
  status: string;
  priority: string;
  customer_name: string;
  pickup_location_name: string;
  dropoff_location_name: string;
  scheduled_pickup_at: string;
  actual_pickup_at: string;
  scheduled_dropoff_at: string;
  actual_dropoff_at: string;
  sla_deadline_at: string;
  sla_met: boolean;
  vehicle?: { plate_number: string };
  driver?: { first_name: string; last_name: string };
}

interface DispatchTableProps {
  jobs: DispatchJob[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "in_progress":
    case "dispatched":
      return <Truck className="w-4 h-4 text-blue-500" />;
    case "pending":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "cancelled":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
};

export const DispatchTable = ({ jobs }: DispatchTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = jobs.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = jobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const completedJobs = jobs.filter(j => j.status === "completed").length;
  const slaMetJobs = jobs.filter(j => j.sla_met === true).length;
  const slaTotal = jobs.filter(j => j.sla_met !== null).length;
  const slaRate = slaTotal > 0 ? (slaMetJobs / slaTotal) * 100 : 0;

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Dispatch Jobs</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No dispatch jobs recorded in this period
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
            <div className="text-sm text-muted-foreground">Total Jobs</div>
            <div className="text-2xl font-bold text-foreground">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-green-500">{completedJobs}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">SLA Met</div>
            <div className="text-2xl font-bold text-blue-500">{slaMetJobs}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">SLA Rate</div>
            <div className={cn(
              "text-2xl font-bold",
              slaRate >= 90 ? "text-green-500" :
              slaRate >= 70 ? "text-amber-500" :
              "text-red-500"
            )}>
              {slaRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-primary" />
            Dispatch Jobs ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Job #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{job.job_number}</td>
                    <td className="px-4 py-3 text-sm capitalize">{job.job_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-medium">{job.customer_name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium capitalize",
                          job.status === "completed" ? "bg-green-500/20 text-green-600" :
                          job.status === "in_progress" || job.status === "dispatched" ? "bg-blue-500/20 text-blue-600" :
                          job.status === "pending" ? "bg-amber-500/20 text-amber-600" :
                          job.status === "cancelled" ? "bg-red-500/20 text-red-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {job.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{job.vehicle?.plate_number || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {job.driver ? `${job.driver.first_name} ${job.driver.last_name}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="truncate max-w-[150px]">{job.pickup_location_name || "-"}</span>
                        <span className="text-muted-foreground">→ {job.dropoff_location_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {job.sla_met !== null ? (
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          job.sla_met ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                        )}>
                          {job.sla_met ? "Met" : "Missed"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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