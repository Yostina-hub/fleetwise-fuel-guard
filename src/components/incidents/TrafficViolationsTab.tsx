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
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

// Mock data for traffic violations
const mockViolations = [
  {
    id: "1",
    violation_number: "VIO-00001234",
    violation_type: "speeding",
    vehicle_plate: "KAA 123A",
    driver_name: "John Mwangi",
    fine_amount: 5000,
    location: "Mombasa Road, Nairobi",
    violation_date: "2025-12-15T14:30:00",
    due_date: "2026-01-15",
    status: "unpaid",
    points_deducted: 3,
    notes: "Exceeded speed limit by 25 km/h in urban area",
  },
  {
    id: "2",
    violation_number: "VIO-00001235",
    violation_type: "parking",
    vehicle_plate: "KBA 456B",
    driver_name: "Mary Wanjiku",
    fine_amount: 2000,
    location: "CBD, Nairobi",
    violation_date: "2025-12-18T09:15:00",
    due_date: "2026-01-18",
    status: "paid",
    points_deducted: 0,
    notes: "Illegal parking in no-parking zone",
  },
  {
    id: "3",
    violation_number: "VIO-00001236",
    violation_type: "red_light",
    vehicle_plate: "KCA 789C",
    driver_name: "Peter Ochieng",
    fine_amount: 10000,
    location: "Uhuru Highway Junction",
    violation_date: "2025-12-20T17:45:00",
    due_date: "2026-01-20",
    status: "disputed",
    points_deducted: 5,
    notes: "Red light violation captured by traffic camera",
  },
  {
    id: "4",
    violation_number: "VIO-00001237",
    violation_type: "overloading",
    vehicle_plate: "KDA 012D",
    driver_name: "James Kiprop",
    fine_amount: 15000,
    location: "Thika Road Weighbridge",
    violation_date: "2025-12-22T11:00:00",
    due_date: "2026-01-22",
    status: "unpaid",
    points_deducted: 4,
    notes: "Vehicle exceeded weight limit by 2 tons",
  },
];

const TrafficViolationsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading] = useState(false);

  const [newViolation, setNewViolation] = useState({
    violation_type: 'speeding',
    vehicle_plate: '',
    driver_name: '',
    fine_amount: 0,
    location: '',
    violation_date: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const getStatusBadge = (status: string) => {
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
        return <Badge variant="outline">{status}</Badge>;
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

  const filteredViolations = mockViolations.filter(violation => {
    const matchesStatus = statusFilter === 'all' || violation.status === statusFilter;
    const matchesType = typeFilter === 'all' || violation.violation_type === typeFilter;
    const matchesSearch = !searchQuery || 
      violation.violation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.driver_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalItems = filteredViolations.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedViolations = filteredViolations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, searchQuery]);

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
            <Card key={violation.id} className={violation.status === 'unpaid' ? 'border-destructive/30' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold">{violation.violation_number}</span>
                      {getStatusBadge(violation.status)}
                      {getTypeBadge(violation.violation_type)}
                      {violation.points_deducted > 0 && (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          -{violation.points_deducted} pts
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm">{violation.notes}</p>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        {format(new Date(violation.violation_date), "MMM dd, yyyy HH:mm")}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" aria-hidden="true" />
                        {violation.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="w-4 h-4" aria-hidden="true" />
                        {violation.vehicle_plate}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" aria-hidden="true" />
                        {violation.driver_name}
                      </span>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        Fine: <span className="font-semibold">KES {violation.fine_amount.toLocaleString()}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Due: {format(new Date(violation.due_date), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button size="sm" variant="outline" className="gap-1" aria-label={`View details for violation ${violation.violation_number}`}>
                      <Receipt className="w-4 h-4" aria-hidden="true" />
                      View Details
                    </Button>
                    {violation.status === 'unpaid' && (
                      <Button 
                        size="sm" 
                        className="bg-success hover:bg-success/90 gap-1"
                        aria-label={`Mark violation ${violation.violation_number} as paid`}
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
                <Label htmlFor="violation-vehicle">Vehicle Plate</Label>
                <Input 
                  id="violation-vehicle"
                  value={newViolation.vehicle_plate}
                  onChange={e => setNewViolation({...newViolation, vehicle_plate: e.target.value})}
                  placeholder="KAA 123A"
                  aria-label="Vehicle plate number"
                />
              </div>
              <div>
                <Label htmlFor="violation-driver">Driver Name</Label>
                <Input 
                  id="violation-driver"
                  value={newViolation.driver_name}
                  onChange={e => setNewViolation({...newViolation, driver_name: e.target.value})}
                  placeholder="Driver name"
                  aria-label="Driver name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="violation-location">Location</Label>
              <Input 
                id="violation-location"
                value={newViolation.location}
                onChange={e => setNewViolation({...newViolation, location: e.target.value})}
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
                <Label htmlFor="violation-fine">Fine Amount (KES)</Label>
                <Input 
                  id="violation-fine"
                  type="number"
                  value={newViolation.fine_amount}
                  onChange={e => setNewViolation({...newViolation, fine_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  aria-label="Fine amount in KES"
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
            <Button onClick={() => setShowCreateDialog(false)} aria-label="Save traffic violation">
              Save Violation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrafficViolationsTab;
