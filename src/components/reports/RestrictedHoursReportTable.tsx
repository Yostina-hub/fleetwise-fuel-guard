import { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Search, Truck, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { TablePagination } from "@/components/reports/TablePagination";

interface RestrictedHoursViolation {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  violation_time: string;
  allowed_start_time: string;
  allowed_end_time: string;
  actual_time: string;
  duration_minutes: number | null;
  start_location: string | null;
  end_location: string | null;
  distance_km: number | null;
  is_acknowledged: boolean;
  vehicle?: {
    plate_number: string;
    make?: string;
    model?: string;
  };
  driver?: {
    first_name: string;
    last_name: string;
  };
}

interface RestrictedHoursReportTableProps {
  startDate: string;
  endDate: string;
  searchQuery?: string;
}

const RestrictedHoursReportTable = ({
  startDate,
  endDate,
  searchQuery = "",
}: RestrictedHoursReportTableProps) => {
  const { organizationId } = useOrganization();
  const [violations, setViolations] = useState<RestrictedHoursViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (organizationId) {
      fetchViolations();
      fetchVehicles();
    }
  }, [organizationId, startDate, endDate]);

  const fetchVehicles = async () => {
    try {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      
      if (data) setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("restricted_hours_violations")
        .select(`
          *,
          vehicle:vehicles(plate_number, make, model),
          driver:drivers(first_name, last_name)
        `)
        .eq("organization_id", organizationId!)
        .gte("violation_time", startDate)
        .lte("violation_time", endDate + "T23:59:59")
        .order("violation_time", { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error("Error fetching violations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredViolations = useMemo(() => {
    let result = violations;

    if (vehicleFilter !== "all") {
      result = result.filter((v) => v.vehicle_id === vehicleFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.vehicle?.plate_number?.toLowerCase().includes(query) ||
          v.driver?.first_name?.toLowerCase().includes(query) ||
          v.driver?.last_name?.toLowerCase().includes(query) ||
          v.start_location?.toLowerCase().includes(query) ||
          v.end_location?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [violations, vehicleFilter, searchQuery]);

  const paginatedViolations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredViolations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredViolations, currentPage]);

  

  const formatTime = (time: string) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Restricted Hours Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Restricted Hours Violations
            <Badge variant="secondary" className="ml-2">
              {filteredViolations.length} records
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-[200px]">
                <Truck className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-green-500/10 mb-4">
              <Clock className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">No Violations Found</h3>
            <p className="text-muted-foreground mt-1">
              No restricted hours violations in the selected period
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Allowed Window</TableHead>
                    <TableHead>Actual Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedViolations.map((violation) => (
                    <TableRow key={violation.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <div>
                            <div>{format(new Date(violation.violation_time), "MMM dd, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(violation.violation_time), "HH:mm:ss")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {violation.vehicle?.plate_number || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {violation.driver
                          ? `${violation.driver.first_name} ${violation.driver.last_name}`
                          : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTime(violation.allowed_start_time)} - {formatTime(violation.allowed_end_time)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-destructive">
                        {formatTime(violation.actual_time)}
                      </TableCell>
                      <TableCell>
                        {violation.duration_minutes
                          ? `${violation.duration_minutes} min`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {violation.distance_km
                          ? `${violation.distance_km.toFixed(1)} km`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={violation.is_acknowledged ? "secondary" : "destructive"}
                        >
                          {violation.is_acknowledged ? "Acknowledged" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredViolations.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RestrictedHoursReportTable;
