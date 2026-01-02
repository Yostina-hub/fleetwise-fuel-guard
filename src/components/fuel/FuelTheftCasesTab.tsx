import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, MapPin, Clock, FileText, Loader2, Eye, Download } from "lucide-react";
import { useFuelTheftCases } from "@/hooks/useFuelTheftCases";
import { useFuelPageContext } from "@/pages/FuelMonitoring";
import { format } from "date-fns";
import TheftCaseDetailDialog from "./TheftCaseDetailDialog";
import { toast } from "sonner";

const FuelTheftCasesTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const { cases, loading, updateCase, closeCase } = useFuelTheftCases({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  });
  const { getVehiclePlate, getDriverName, vehicles, drivers } = useFuelPageContext();
  
  const selectedCaseData = cases.find(c => c.id === selectedCase);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Open</Badge>;
      case 'investigating':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'confirmed':
        return <Badge variant="destructive">Confirmed</Badge>;
      case 'false_positive':
        return <Badge variant="outline">False Positive</Badge>;
      case 'closed':
        return <Badge className="bg-success/10 text-success border-success/20">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const handleStartInvestigation = async (id: string) => {
    await updateCase(id, { status: 'investigating' });
  };

  const handleCloseCase = async (id: string, confirmed: boolean) => {
    await closeCase(id, confirmed ? 'confirmed' : 'false_positive', 'Case reviewed and closed');
  };

  const exportCasesCSV = () => {
    const headers = ["Case Number", "Status", "Priority", "Vehicle", "Driver", "Fuel Lost (L)", "Est. Value ($)", "Detected At", "Location", "Notes"];
    const rows = cases.map(c => [
      c.case_number,
      c.status,
      c.priority || "",
      getVehiclePlate(c.vehicle_id),
      getDriverName(c.driver_id || undefined),
      c.fuel_lost_liters,
      c.estimated_value || 0,
      format(new Date(c.detected_at), "yyyy-MM-dd HH:mm"),
      c.location_name || "",
      c.investigation_notes || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theft-cases-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Theft cases exported");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-between gap-4">
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="false_positive">False Positive</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportCasesCSV}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Cases Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">
              {cases.filter(c => c.status === 'open').length}
            </div>
            <div className="text-sm text-muted-foreground">Open Cases</div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">
              {cases.filter(c => c.status === 'investigating').length}
            </div>
            <div className="text-sm text-muted-foreground">Investigating</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {cases.reduce((sum, c) => sum + c.fuel_lost_liters, 0).toFixed(0)}L
            </div>
            <div className="text-sm text-muted-foreground">Total Fuel Lost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              ${cases.reduce((sum, c) => sum + (c.estimated_value || 0), 0).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">Estimated Loss</div>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {cases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No theft cases found</p>
            </CardContent>
          </Card>
        ) : (
          cases.map(caseItem => (
            <Card key={caseItem.id} className={caseItem.status === 'open' ? 'border-destructive/50' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{caseItem.case_number}</span>
                      {getStatusBadge(caseItem.status)}
                      {getPriorityBadge(caseItem.priority || undefined)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Vehicle:</span>
                        <div className="font-medium">{getVehiclePlate(caseItem.vehicle_id)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Driver:</span>
                        <div className="font-medium">{getDriverName(caseItem.driver_id || undefined)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fuel Lost:</span>
                        <div className="font-medium text-destructive">{caseItem.fuel_lost_liters.toFixed(1)}L</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Value:</span>
                        <div className="font-medium">${(caseItem.estimated_value || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(caseItem.detected_at), "MMM dd, yyyy HH:mm")}
                      </span>
                      {caseItem.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {caseItem.location_name}
                        </span>
                      )}
                    </div>

                    {caseItem.investigation_notes && (
                      <div className="text-sm bg-muted/50 p-3 rounded-lg">
                        <FileText className="w-4 h-4 inline mr-2" />
                        {caseItem.investigation_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        setSelectedCase(caseItem.id);
                        setShowDetail(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                    {caseItem.status === 'open' && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleStartInvestigation(caseItem.id)}
                      >
                        Start Investigation
                      </Button>
                    )}
                    {caseItem.status === 'investigating' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleCloseCase(caseItem.id, true)}
                        >
                          Confirm Theft
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCloseCase(caseItem.id, false)}
                        >
                          False Positive
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <TheftCaseDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        caseItem={selectedCaseData || null}
        getVehiclePlate={getVehiclePlate}
        getDriverName={getDriverName}
        onUpdateNotes={async (id, notes) => {
          await updateCase(id, { investigation_notes: notes });
        }}
        onStartInvestigation={handleStartInvestigation}
        onCloseCase={handleCloseCase}
      />
    </div>
  );
};

export default FuelTheftCasesTab;
