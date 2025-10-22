import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const IncidentsTab = () => {
  const { organizationId } = useOrganization();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*, vehicles(plate_number, make, model), drivers(first_name, last_name)")
        .eq("organization_id", organizationId!)
        .order("incident_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      investigating: "default",
      resolved: "secondary",
      closed: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Incident Reports</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Incident #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Est. Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents?.map((incident: any) => (
            <TableRow key={incident.id}>
              <TableCell className="font-medium">{incident.incident_number}</TableCell>
              <TableCell className="capitalize">{incident.incident_type}</TableCell>
              <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
              <TableCell>
                {incident.vehicles
                  ? `${incident.vehicles.plate_number} (${incident.vehicles.make})`
                  : "-"}
              </TableCell>
              <TableCell>
                {incident.drivers
                  ? `${incident.drivers.first_name} ${incident.drivers.last_name}`
                  : "-"}
              </TableCell>
              <TableCell>
                {format(new Date(incident.incident_time), "MMM dd, yyyy HH:mm")}
              </TableCell>
              <TableCell>{getStatusBadge(incident.status)}</TableCell>
              <TableCell>
                {incident.estimated_cost
                  ? `$${Number(incident.estimated_cost).toFixed(2)}`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default IncidentsTab;
