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
import { AlertOctagon, Clock, MapPin, DollarSign } from "lucide-react";

interface Incident {
  id: string;
  incident_number: string;
  incident_time: string;
  incident_type: string;
  severity: string;
  status: string;
  location?: string;
  description: string;
  estimated_cost?: number;
  vehicle?: { plate_number: string } | null;
  driver?: { first_name: string; last_name: string } | null;
}

interface IncidentsTableProps {
  incidents: Incident[];
}

export const IncidentsTable = ({ incidents }: IncidentsTableProps) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "major":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Major</Badge>;
      case "moderate":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Moderate</Badge>;
      default:
        return <Badge variant="secondary">Minor</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Open</Badge>;
      case "investigating":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Investigating</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      accident: "bg-red-500/20 text-red-500",
      breakdown: "bg-orange-500/20 text-orange-500",
      violation: "bg-yellow-500/20 text-yellow-600",
      theft: "bg-purple-500/20 text-purple-500",
      damage: "bg-blue-500/20 text-blue-500",
    };
    return (
      <Badge className={typeColors[type] || "bg-muted"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (incidents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertOctagon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Incidents</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No incidents recorded in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertOctagon className="w-5 h-5 text-destructive" />
          Incidents ({incidents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Est. Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-mono text-xs">
                  {incident.incident_number}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(incident.incident_time), "MMM d, HH:mm")}
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(incident.incident_type)}</TableCell>
                <TableCell className="font-medium">
                  {incident.vehicle?.plate_number || "-"}
                </TableCell>
                <TableCell>
                  {incident.driver 
                    ? `${incident.driver.first_name} ${incident.driver.last_name}`
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 max-w-[150px] truncate">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{incident.location || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                <TableCell>{getStatusBadge(incident.status)}</TableCell>
                <TableCell>
                  {incident.estimated_cost ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      {incident.estimated_cost.toLocaleString()}
                    </div>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
