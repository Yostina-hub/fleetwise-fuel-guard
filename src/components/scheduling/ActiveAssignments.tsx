import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, User, Calendar, MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  dispatched: "bg-purple-500",
  in_progress: "bg-indigo-500",
  completed: "bg-green-600",
  canceled: "bg-gray-600",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  dispatched: "Dispatched",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

export const ActiveAssignments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["active-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_assignments" as any)
        .select(`
          *,
          trip_request:trip_request_id(
            request_number,
            purpose,
            pickup_at,
            return_at,
            pickup_geofence:pickup_geofence_id(name),
            drop_geofence:drop_geofence_id(name)
          ),
          vehicle:vehicle_id(plate_number, make, model),
          driver:driver_id(first_name, last_name)
        `)
        .in("status", ["scheduled", "dispatched", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(assignments?.length || 0, 10);

  const completeAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("trip_assignments" as any)
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (error) throw error;

      // Update trip request status
      const { data: assignment } = await supabase
        .from("trip_assignments" as any)
        .select("trip_request_id")
        .eq("id", assignmentId)
        .single();

      if (assignment) {
        await supabase
          .from("trip_requests" as any)
          .update({ status: "completed" })
          .eq("id", (assignment as any).trip_request_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({
        title: "Completed",
        description: "Trip assignment marked as completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading assignments...</div>
        </CardContent>
      </Card>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No active assignments. All vehicles are available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.slice(startIndex, endIndex).map((assignment: any) => (
              <TableRow key={assignment.id}>
                <TableCell>
                  <div className="font-medium">
                    {assignment.trip_request?.request_number}
                  </div>
                  <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {assignment.trip_request?.purpose}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {assignment.vehicle?.plate_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.vehicle?.make} {assignment.vehicle?.model}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      {assignment.driver?.first_name} {assignment.driver?.last_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3 h-3" />
                    <div>
                      <div>
                        {format(new Date(assignment.trip_request?.pickup_at), "MMM dd, HH:mm")}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        to {format(new Date(assignment.trip_request?.return_at), "MMM dd, HH:mm")}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3" />
                    <div className="max-w-[150px] truncate">
                      {assignment.trip_request?.pickup_geofence?.name || "N/A"}
                      {assignment.trip_request?.drop_geofence && 
                        ` → ${assignment.trip_request.drop_geofence.name}`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[assignment.status]}>
                    {statusLabels[assignment.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignment.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeAssignment.mutate(assignment.id)}
                      disabled={completeAssignment.isPending}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={assignments.length}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
};
