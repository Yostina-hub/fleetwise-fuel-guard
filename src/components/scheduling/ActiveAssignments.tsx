import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Truck, User, Calendar, MapPin, CheckCircle, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useState, useEffect } from "react";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { friendlyToastError } from "@/lib/errorMessages";

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
  const { organizationId } = useOrganization();
  const [showCreate, setShowCreate] = useState(false);

  // Realtime subscription
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel("trip-assignments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_assignments" },
        () => { queryClient.invalidateQueries({ queryKey: ["active-assignments", organizationId] }); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, organizationId]);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["active-assignments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_assignments")
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
        .eq("organization_id", organizationId!)
        .in("status", ["scheduled", "dispatched", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!organizationId,
  });

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(assignments?.length || 0, 10);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, any> = { status };
      if (status === "dispatched") updateData.dispatched_at = new Date().toISOString();
      if (status === "in_progress") updateData.started_at = new Date().toISOString();
      if (status === "completed") updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from("trip_assignments")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;

      // If completing, also update the trip request
      if (status === "completed") {
        const { data: assignment } = await supabase
          .from("trip_assignments")
          .select("trip_request_id")
          .eq("id", id)
          .single();
        if (assignment) {
          await supabase
            .from("trip_requests")
            .update({ status: "completed" })
            .eq("id", assignment.trip_request_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      toast({ title: "Updated", description: "Assignment status updated" });
    },
    onError: (error: any) => {
      friendlyToastError(error);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Assignments</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Assignment
          </Button>
        </CardHeader>
        <CardContent>
          {!assignments || assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active assignments. All vehicles are available.
            </div>
          ) : (
            <>
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
                        <div className="font-medium">{assignment.trip_request?.request_number || "—"}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {assignment.trip_request?.purpose || ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{assignment.vehicle?.plate_number || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.vehicle?.make} {assignment.vehicle?.model}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>{assignment.driver?.first_name} {assignment.driver?.last_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.trip_request?.pickup_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            <div>
                              <div>{format(new Date(assignment.trip_request.pickup_at), "MMM dd, HH:mm")}</div>
                              {assignment.trip_request?.return_at && (
                                <div className="text-muted-foreground text-xs">
                                  to {format(new Date(assignment.trip_request.return_at), "MMM dd, HH:mm")}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : "—"}
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
                        <Badge className={statusColors[assignment.status] || "bg-muted"}>
                          {statusLabels[assignment.status] || assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {assignment.status === "scheduled" && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateStatus.mutate({ id: assignment.id, status: "dispatched" })}
                              disabled={updateStatus.isPending}>
                              Dispatch
                            </Button>
                          )}
                          {assignment.status === "dispatched" && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateStatus.mutate({ id: assignment.id, status: "in_progress" })}
                              disabled={updateStatus.isPending}>
                              Start
                            </Button>
                          )}
                          {(assignment.status === "in_progress" || assignment.status === "dispatched") && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateStatus.mutate({ id: assignment.id, status: "completed" })}
                              disabled={updateStatus.isPending}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
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
            </>
          )}
        </CardContent>
      </Card>

      <CreateAssignmentDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
};
