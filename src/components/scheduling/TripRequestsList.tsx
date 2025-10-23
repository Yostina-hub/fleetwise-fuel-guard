import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, MapPin, Users, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { useTripRequests } from "@/hooks/useTripRequests";
import { ApprovalFlowViewer } from "@/components/scheduling/ApprovalFlowViewer";
import { VehicleRecommendations } from "@/components/scheduling/VehicleRecommendations";
import { useState } from "react";

interface TripRequestsListProps {
  requests: any[];
  loading: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  submitted: "bg-yellow-500",
  approved: "bg-green-500",
  scheduled: "bg-blue-500",
  dispatched: "bg-purple-500",
  in_service: "bg-indigo-500",
  completed: "bg-green-600",
  rejected: "bg-red-500",
  canceled: "bg-gray-600",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  scheduled: "Scheduled",
  dispatched: "Dispatched",
  in_service: "In Service",
  completed: "Completed",
  rejected: "Rejected",
  canceled: "Canceled",
};

export const TripRequestsList = ({ requests, loading }: TripRequestsListProps) => {
  const { submitRequest } = useTripRequests();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No trip requests found. Create your first request to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.request_number}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">{request.purpose}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      <div>
                        <div>{format(new Date(request.pickup_at), "MMM dd, HH:mm")}</div>
                        <div className="text-muted-foreground text-xs">
                          to {format(new Date(request.return_at), "MMM dd, HH:mm")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3" />
                      <div className="max-w-[150px] truncate">
                        {request.pickup_geofence?.name || "Not specified"}
                        {request.drop_geofence && ` → ${request.drop_geofence.name}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {request.passengers}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {request.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => submitRequest.mutate(request.id)}
                          disabled={submitRequest.isPending}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Submit
                        </Button>
                      )}
                      {['submitted', 'approved', 'rejected'].includes(request.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetails(request)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Trip Request: {selectedRequest?.request_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Request Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Purpose</div>
                <div>{selectedRequest?.purpose}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <Badge className={statusColors[selectedRequest?.status]}>
                  {statusLabels[selectedRequest?.status]}
                </Badge>
              </div>
            </div>

            {/* Approval Flow */}
            {selectedRequest && selectedRequest.status !== 'draft' && (
              <ApprovalFlowViewer requestId={selectedRequest.id} />
            )}

            {/* Vehicle Recommendations (only for approved requests) */}
            {selectedRequest && selectedRequest.status === 'approved' && (
              <VehicleRecommendations
                requestId={selectedRequest.id}
                pickupAt={selectedRequest.pickup_at}
                returnAt={selectedRequest.return_at}
                requiredClass={selectedRequest.required_class}
                passengers={selectedRequest.passengers}
                pickupGeofenceId={selectedRequest.pickup_geofence_id}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
