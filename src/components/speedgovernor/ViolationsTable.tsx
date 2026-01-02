import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { useSpeedGovernor, useSpeedViolations, SpeedViolation } from "@/hooks/useSpeedGovernor";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";

interface ViolationsTableProps {
  vehicles: Array<{ id: string; plate: string }>;
}

export const ViolationsTable = ({ vehicles }: ViolationsTableProps) => {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { acknowledgeViolation } = useSpeedGovernor();
  
  const filters = {
    vehicleId: vehicleFilter || undefined,
    severity: severityFilter || undefined,
  };

  const { data, isLoading } = useSpeedViolations(page, pageSize, filters);
  const violations = data?.violations || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExportCSV = () => {
    if (!violations.length) return;

    const headers = ["Time", "Vehicle", "Speed (km/h)", "Limit (km/h)", "Excess", "Duration", "Location", "Severity", "Acknowledged"];
    const rows = violations.map(v => [
      format(new Date(v.violation_time), "yyyy-MM-dd HH:mm:ss"),
      v.vehicles?.plate_number || "Unknown",
      v.speed_kmh,
      v.speed_limit_kmh,
      v.speed_kmh - v.speed_limit_kmh,
      v.duration_seconds ? `${v.duration_seconds}s` : "N/A",
      v.location_name || "Unknown",
      v.severity,
      v.is_acknowledged ? "Yes" : "No"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speed-violations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!violations.length) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Speed Violations Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 20, 30);
    doc.text(`Total Violations: ${totalCount}`, 20, 36);

    let y = 50;
    doc.setFontSize(8);
    
    // Header
    doc.setFont(undefined, "bold");
    doc.text("Time", 20, y);
    doc.text("Vehicle", 55, y);
    doc.text("Speed", 85, y);
    doc.text("Limit", 100, y);
    doc.text("Location", 115, y);
    doc.text("Severity", 170, y);
    doc.setFont(undefined, "normal");
    
    y += 6;

    violations.slice(0, 30).forEach(v => {
      doc.text(format(new Date(v.violation_time), "MM/dd HH:mm"), 20, y);
      doc.text(v.vehicles?.plate_number || "Unknown", 55, y);
      doc.text(`${v.speed_kmh}`, 85, y);
      doc.text(`${v.speed_limit_kmh}`, 100, y);
      doc.text((v.location_name || "Unknown").slice(0, 30), 115, y);
      doc.text(v.severity, 170, y);
      y += 5;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`speed-violations-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="default">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Speed Violations Log
            </CardTitle>
            <CardDescription>
              {totalCount} total violations • Page {page + 1} of {Math.max(1, totalPages)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Vehicle</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All vehicles</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setVehicleFilter("");
                  setSeverityFilter("");
                  setPage(0);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : violations.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">No violations found</p>
            <p className="text-muted-foreground text-sm">
              {vehicleFilter || severityFilter 
                ? "Try adjusting your filters" 
                : "Great! No speed violations recorded"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Excess</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {format(new Date(violation.violation_time), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {violation.vehicles?.plate_number || "Unknown"}
                    </TableCell>
                    <TableCell className="text-destructive font-semibold">
                      {violation.speed_kmh} km/h
                    </TableCell>
                    <TableCell>{violation.speed_limit_kmh} km/h</TableCell>
                    <TableCell className="text-destructive font-medium">
                      +{Math.round(violation.speed_kmh - violation.speed_limit_kmh)}
                    </TableCell>
                    <TableCell className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(violation.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate" title={violation.location_name || undefined}>
                      {violation.location_name || "Unknown"}
                    </TableCell>
                    <TableCell>{getSeverityBadge(violation.severity)}</TableCell>
                    <TableCell>
                      {violation.is_acknowledged ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Reviewed
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeViolation.mutate(violation.id)}
                          disabled={acknowledgeViolation.isPending}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
