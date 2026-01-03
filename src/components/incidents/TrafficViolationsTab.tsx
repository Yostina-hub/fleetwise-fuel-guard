import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/reports/TablePagination";
import { 
  Plus, 
  Search, 
  Receipt, 
  DollarSign,
  Clock,
  Car,
  User,
  MapPin,
  Loader2,
  Download,
  CheckCircle
} from "lucide-react";
import { useIncidentsManagement } from "@/hooks/useIncidentsManagement";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

const TrafficViolationsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { violations, loading, recordViolationPayment, refetch } = useIncidentsManagement();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { organizationId } = useOrganization();

  const [newViolation, setNewViolation] = useState({
    violation_type: 'speeding',
    vehicle_id: '',
    driver_id: '',
    fine_amount: 0,
    location_name: '',
    violation_date: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "N/A";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string | null) => {
    if (!driverId) return "N/A";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'unpaid':
        return <Badge variant="destructive">Unpaid</Badge>;
      case 'paid':
        return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'disputed':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Disputed</Badge>;
      case 'waived':
        return <Badge variant="outline">Waived</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      speeding: 'Speeding',
      parking: 'Parking',
      red_light: 'Red Light',
      overloading: 'Overloading',
      no_license: 'No License',
      other: 'Other',
    };
    return <Badge variant="outline" className="capitalize">{typeLabels[type] || type}</Badge>;
  };

  const filteredViolations = violations.filter(violation => {
    const matchesStatus = statusFilter === 'all' || violation.payment_status === statusFilter;
    const matchesType = typeFilter === 'all' || violation.violation_type === typeFilter;
    const matchesSearch = !searchQuery || 
      violation.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getVehiclePlate(violation.vehicle_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getDriverName(violation.driver_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalItems = filteredViolations.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedViolations = filteredViolations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, searchQuery]);

  const handleCreateViolation = async () => {
    if (!newViolation.vehicle_id || !organizationId) return;

    try {
      const ticketNumber = `VIO-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from("traffic_violations")
        .insert([{
          ticket_number: ticketNumber,
          violation_type: newViolation.violation_type,
          vehicle_id: newViolation.vehicle_id,
          driver_id: newViolation.driver_id || null,
          fine_amount: newViolation.fine_amount || null,
          location_name: newViolation.location_name || null,
          violation_date: newViolation.violation_date,
          notes: newViolation.notes || null,
          payment_status: 'unpaid',
          organization_id: organizationId,
        }]);

      if (error) throw error;
      toast({ title: "Violation recorded", description: "Traffic violation has been logged" });
      setShowCreateDialog(false);
      setNewViolation({
        violation_type: 'speeding',
        vehicle_id: '',
        driver_id: '',
        fine_amount: 0,
        location_name: '',
        violation_date: new Date().toISOString().slice(0, 16),
        notes: '',
      });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite" aria-label="Loading traffic violations...">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search violations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search traffic violations"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by payment status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by violation type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="speeding">Speeding</SelectItem>
              <SelectItem value="parking">Parking</SelectItem>
              <SelectItem value="red_light">Red Light</SelectItem>
              <SelectItem value="overloading">Overloading</SelectItem>
              <SelectItem value="no_license">No License</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" aria-label="Export violations">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)} aria-label="Record new traffic violation">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Record Violation
          </Button>
        </div>
      </div>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No traffic violations found">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No Traffic Violations</h3>
            <p>No violations match your search criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedViolations.map(violation => (
            <Card key={violation.id} className={violation.payment_status === 'unpaid' ? 'border-destructive/30' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{violation.ticket_number || 'N/A'}</span>
                      {getStatusBadge(violation.payment_status)}
                      {getTypeBadge(violation.violation_type)}
                      {violation.points_assigned && violation.points_assigned > 0 && (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          -{violation.points_assigned} pts
                        </Badge>
                      )}
                    </div>

                    {violation.notes && <p className="text-sm">{violation.notes}</p>}

                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        {format(new Date(violation.violation_date), "MMM dd, yyyy HH:mm")}
                      </span>
                      {violation.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" aria-hidden="true" />
                          {violation.location_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Car className="w-4 h-4" aria-hidden="true" />
                        {getVehiclePlate(violation.vehicle_id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" aria-hidden="true" />
                        {getDriverName(violation.driver_id)}
                      </span>
                    </div>

                    {violation.fine_amount && (
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          Fine: <span className="font-semibold">${violation.fine_amount.toLocaleString()}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button size="sm" variant="outline" className="gap-1" aria-label={`View details for violation ${violation.ticket_number}`}>
                      <Receipt className="w-4 h-4" aria-hidden="true" />
                      View Details
                    </Button>
                    {violation.payment_status !== 'paid' && (
                      <Button 
                        size="sm" 
                        className="bg-success hover:bg-success/90 gap-1"
                        onClick={() => recordViolationPayment(violation.id)}
                        aria-label={`Mark violation ${violation.ticket_number} as paid`}
                      >
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        Mark Paid
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

      {/* Create Violation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Traffic Violation</DialogTitle>
            <DialogDescription>
              Enter details of the traffic violation for tracking and payment management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="violation-type">Violation Type</Label>
              <Select 
                value={newViolation.violation_type}
                onValueChange={v => setNewViolation({...newViolation, violation_type: v})}
              >
                <SelectTrigger id="violation-type" aria-label="Select violation type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speeding">Speeding</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="red_light">Red Light</SelectItem>
                  <SelectItem value="overloading">Overloading</SelectItem>
                  <SelectItem value="no_license">No License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="violation-vehicle">Vehicle *</Label>
                <Select 
                  value={newViolation.vehicle_id}
                  onValueChange={v => setNewViolation({...newViolation, vehicle_id: v})}
                >
                  <SelectTrigger id="violation-vehicle" aria-label="Select vehicle">
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
                <Label htmlFor="violation-driver">Driver</Label>
                <Select 
                  value={newViolation.driver_id}
                  onValueChange={v => setNewViolation({...newViolation, driver_id: v})}
                >
                  <SelectTrigger id="violation-driver" aria-label="Select driver">
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
              <Label htmlFor="violation-location">Location</Label>
              <Input 
                id="violation-location"
                value={newViolation.location_name}
                onChange={e => setNewViolation({...newViolation, location_name: e.target.value})}
                placeholder="Enter violation location"
                aria-label="Violation location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="violation-datetime">Date & Time</Label>
                <Input 
                  id="violation-datetime"
                  type="datetime-local"
                  value={newViolation.violation_date}
                  onChange={e => setNewViolation({...newViolation, violation_date: e.target.value})}
                  aria-label="Violation date and time"
                />
              </div>
              <div>
                <Label htmlFor="violation-fine">Fine Amount ($)</Label>
                <Input 
                  id="violation-fine"
                  type="number"
                  value={newViolation.fine_amount}
                  onChange={e => setNewViolation({...newViolation, fine_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  aria-label="Fine amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="violation-notes">Notes</Label>
              <Input 
                id="violation-notes"
                value={newViolation.notes}
                onChange={e => setNewViolation({...newViolation, notes: e.target.value})}
                placeholder="Additional details..."
                aria-label="Additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateViolation} disabled={!newViolation.vehicle_id} aria-label="Save traffic violation">
              Save Violation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrafficViolationsTab;
