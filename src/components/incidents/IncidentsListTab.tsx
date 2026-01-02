import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/reports/TablePagination";
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Car, 
  User,
  MapPin,
  Clock,
  FileText,
  Loader2
} from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

const IncidentsListTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { incidents, loading, createIncident, updateIncidentStatus } = useIncidentsManagement({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
  });
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const [newIncident, setNewIncident] = useState({
    incident_type: 'accident',
    vehicle_id: '',
    driver_id: '',
    incident_time: new Date().toISOString().slice(0, 16),
    location: '',
    description: '',
    severity: 'medium',
    status: 'reported',
  });

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "N/A";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "N/A";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-destructive/20 text-destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reported':
        return <Badge variant="outline">Reported</Badge>;
      case 'investigating':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'resolved':
        return <Badge className="bg-success/10 text-success border-success/20">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredIncidents = incidents.filter(i => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      i.incident_number?.toLowerCase().includes(searchLower) ||
      i.description?.toLowerCase().includes(searchLower) ||
      i.location?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalItems = filteredIncidents.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, severityFilter, searchQuery]);

  const handleCreateIncident = async () => {
    await createIncident({
      ...newIncident,
      vehicle_id: newIncident.vehicle_id || undefined,
      driver_id: newIncident.driver_id || undefined,
    });
    setShowCreateDialog(false);
    setNewIncident({
      incident_type: 'accident',
      vehicle_id: '',
      driver_id: '',
      incident_time: new Date().toISOString().slice(0, 16),
      location: '',
      description: '',
      severity: 'medium',
      status: 'reported',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite" aria-label="Loading incidents...">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search incidents"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by severity">
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
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)} aria-label="Report new incident">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Report Incident
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">
              {incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length}
            </div>
            <div className="text-sm text-muted-foreground">High Severity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {incidents.filter(i => i.status === 'reported' || i.status === 'investigating').length}
            </div>
            <div className="text-sm text-muted-foreground">Open Cases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {incidents.filter(i => i.status === 'resolved').length}
            </div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{incidents.length}</div>
            <div className="text-sm text-muted-foreground">Total Incidents</div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No incidents found">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p>No incidents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedIncidents.map(incident => (
            <Card key={incident.id} className={incident.severity === 'critical' ? 'border-destructive/50' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{incident.incident_number}</span>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                      <Badge variant="outline" className="capitalize">
                        {incident.incident_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-sm">{incident.description}</p>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        {format(new Date(incident.incident_time), "MMM dd, yyyy HH:mm")}
                      </span>
                      {incident.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" aria-hidden="true" />
                          {incident.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Car className="w-4 h-4" aria-hidden="true" />
                        {getVehiclePlate(incident.vehicle_id || undefined)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" aria-hidden="true" />
                        {getDriverName(incident.driver_id || undefined)}
                      </span>
                    </div>

                    {(incident.estimated_cost || incident.actual_cost) && (
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {incident.estimated_cost && (
                          <span>Est. Cost: ${incident.estimated_cost.toLocaleString()}</span>
                        )}
                        {incident.actual_cost && (
                          <span>Actual Cost: ${incident.actual_cost.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button size="sm" variant="outline" className="gap-1" aria-label="View incident details">
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      View Details
                    </Button>
                    {incident.status === 'reported' && (
                      <Button 
                        size="sm"
                        onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                      >
                        Investigate
                      </Button>
                    )}
                    {incident.status === 'investigating' && (
                      <Button 
                        size="sm" 
                        className="bg-success hover:bg-success/90"
                        onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <TablePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create Incident Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the details to report a new incident.</p>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident-type">Incident Type</Label>
                <Select 
                  value={newIncident.incident_type}
                  onValueChange={v => setNewIncident({...newIncident, incident_type: v})}
                >
                  <SelectTrigger id="incident-type" aria-label="Select incident type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="vandalism">Vandalism</SelectItem>
                    <SelectItem value="near_miss">Near Miss</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="incident-severity">Severity</Label>
                <Select 
                  value={newIncident.severity}
                  onValueChange={v => setNewIncident({...newIncident, severity: v})}
                >
                  <SelectTrigger id="incident-severity" aria-label="Select severity level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident-vehicle">Vehicle</Label>
                <Select 
                  value={newIncident.vehicle_id}
                  onValueChange={v => setNewIncident({...newIncident, vehicle_id: v})}
                >
                  <SelectTrigger id="incident-vehicle" aria-label="Select vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="incident-driver">Driver</Label>
                <Select 
                  value={newIncident.driver_id}
                  onValueChange={v => setNewIncident({...newIncident, driver_id: v})}
                >
                  <SelectTrigger id="incident-driver" aria-label="Select driver">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="incident-datetime">Date & Time</Label>
              <Input 
                id="incident-datetime"
                type="datetime-local"
                value={newIncident.incident_time}
                onChange={e => setNewIncident({...newIncident, incident_time: e.target.value})}
                aria-label="Incident date and time"
              />
            </div>

            <div>
              <Label htmlFor="incident-location">Location</Label>
              <Input 
                id="incident-location"
                value={newIncident.location}
                onChange={e => setNewIncident({...newIncident, location: e.target.value})}
                placeholder="Enter incident location"
                aria-label="Incident location"
              />
            </div>

            <div>
              <Label htmlFor="incident-description">Description</Label>
              <Textarea 
                id="incident-description"
                value={newIncident.description}
                onChange={e => setNewIncident({...newIncident, description: e.target.value})}
                placeholder="Describe what happened..."
                rows={3}
                aria-label="Incident description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIncident} disabled={!newIncident.description}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentsListTab;