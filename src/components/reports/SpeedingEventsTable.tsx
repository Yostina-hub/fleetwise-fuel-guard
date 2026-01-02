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
import { Gauge, MapPin, Clock, AlertTriangle } from "lucide-react";
import { TablePagination } from "./TablePagination";

const ITEMS_PER_PAGE = 10;

interface SpeedViolation {
  id: string;
  violation_time: string;
  speed_kmh: number;
  speed_limit_kmh: number;
  duration_seconds?: number;
  location_name?: string;
  severity: string;
  vehicle?: { plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

interface SpeedingEventsTableProps {
  violations: SpeedViolation[];
}

export const SpeedingEventsTable = ({ violations }: SpeedingEventsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = violations.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedViolations = violations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  if (violations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Speeding Events</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No speeding violations recorded in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="w-5 h-5 text-destructive" />
          Speeding Events ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Over By</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedViolations.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(v.violation_time), "MMM d, HH:mm")}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {v.vehicle?.plate_number || "Unknown"}
                </TableCell>
                <TableCell>
                  {v.driver 
                    ? `${v.driver.first_name} ${v.driver.last_name}`
                    : "Unassigned"}
                </TableCell>
                <TableCell className="text-destructive font-semibold">
                  {Number(v.speed_kmh).toFixed(0)} km/h
                </TableCell>
                <TableCell>{Number(v.speed_limit_kmh).toFixed(0)} km/h</TableCell>
                <TableCell className="text-destructive">
                  +{(Number(v.speed_kmh) - Number(v.speed_limit_kmh)).toFixed(0)} km/h
                </TableCell>
                <TableCell>
                  {v.duration_seconds ? `${v.duration_seconds}s` : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 max-w-[150px] truncate">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{v.location_name || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell>{getSeverityBadge(v.severity)}</TableCell>
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