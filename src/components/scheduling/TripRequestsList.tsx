import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar, MapPin, Users, Send } from "lucide-react";
import { format } from "date-fns";
import { useTripRequests } from "@/hooks/useTripRequests";

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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
