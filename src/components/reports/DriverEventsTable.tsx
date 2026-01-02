import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, MapPin, Activity } from "lucide-react";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface DriverEvent {
  id: string;
  event_time: string;
  event_type: string;
  severity: string;
  speed_kmh?: number;
  speed_limit_kmh?: number;
  acceleration_g?: number;
  address?: string;
  vehicle_id: string;
  driver_id?: string;
}

interface DriverEventsTableProps {
  events: DriverEvent[];
  eventType: "harsh_braking" | "harsh_acceleration" | "all";
  title: string;
}

export const DriverEventsTable = ({ events, eventType, title }: DriverEventsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const filteredEvents = eventType === "all" 
    ? events 
    : events.filter(e => e.event_type === eventType);

  const totalItems = filteredEvents.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "speeding":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Speeding</Badge>;
      case "harsh_braking":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Harsh Braking</Badge>;
      case "harsh_acceleration":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Harsh Accel</Badge>;
      case "excessive_idle":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Excessive Idle</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (filteredEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Events Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No {eventType === "all" ? "driver" : eventType.replace("_", " ")} events in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          {title} ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>G-Force</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(event.event_time), "MMM d, HH:mm")}
                  </div>
                </TableCell>
                <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                <TableCell>
                  {event.speed_kmh ? `${Number(event.speed_kmh).toFixed(0)} km/h` : "-"}
                </TableCell>
                <TableCell>
                  {event.acceleration_g ? `${Number(event.acceleration_g).toFixed(2)}g` : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 max-w-[200px] truncate">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{event.address || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell>{getSeverityBadge(event.severity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
};