import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";
import { format } from "date-fns";
import CreateIncidentDialog from "./CreateIncidentDialog";

const IncidentsTab = () => {
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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

  // Filter and search
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    
    return incidents.filter((incident: any) => {
      const matchesSearch = searchQuery === "" || 
        incident.incident_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${incident.drivers?.first_name} ${incident.drivers?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
      const matchesType = typeFilter === "all" || incident.incident_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesSeverity && matchesType;
    });
  }, [incidents, searchQuery, statusFilter, severityFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(start, start + itemsPerPage);
  }, [filteredIncidents, currentPage]);

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
        <h3 className="text-lg font-semibold">Incident Reports ({filteredIncidents.length})</h3>
        <CreateIncidentDialog />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(value) => { setSeverityFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="accident">Accident</SelectItem>
            <SelectItem value="breakdown">Breakdown</SelectItem>
            <SelectItem value="violation">Violation</SelectItem>
            <SelectItem value="theft">Theft</SelectItem>
          </SelectContent>
        </Select>
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
          {paginatedIncidents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No incidents found
              </TableCell>
            </TableRow>
          ) : (
            paginatedIncidents.map((incident: any) => (
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
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default IncidentsTab;
