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
import { MapPin, Clock, LogIn, LogOut } from "lucide-react";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface GeofenceEvent {
  id: string;
  event_time: string;
  event_type: string;
  dwell_time_minutes?: number;
  geofence?: { name: string } | null;
  vehicle?: { plate_number: string } | null;
}

interface GeofenceEventsTableProps {
  events: GeofenceEvent[];
}

export const GeofenceEventsTable = ({ events }: GeofenceEventsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = events.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Geofence Events</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No geofence entries or exits recorded in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-primary" />
          Geofence Events ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Geofence</TableHead>
              <TableHead>Dwell Time</TableHead>
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
                <TableCell>
                  {event.event_type === "enter" ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <LogIn className="w-3 h-3 mr-1" />
                      Entry
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                      <LogOut className="w-3 h-3 mr-1" />
                      Exit
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {event.vehicle?.plate_number || "Unknown"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {event.geofence?.name || "Unknown Zone"}
                  </div>
                </TableCell>
                <TableCell>
                  {event.dwell_time_minutes 
                    ? `${event.dwell_time_minutes} min`
                    : "-"}
                </TableCell>
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