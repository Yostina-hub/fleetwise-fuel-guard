import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Calendar,
  Truck,
  Search,
  Eye,
  Trash2,
  Download
} from "lucide-react";
import { useMaintenanceSchedules, VehicleInspection } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

// Default checklist - can be overridden by database configuration
const DEFAULT_INSPECTION_CHECKLIST = [
  { key: 'tires', label: 'Tires & Wheels', items: ['Tire pressure', 'Tread depth', 'Wheel nuts'] },
  { key: 'brakes', label: 'Brakes', items: ['Brake fluid level', 'Brake pads', 'Parking brake'] },
  { key: 'lights', label: 'Lights & Signals', items: ['Headlights', 'Tail lights', 'Turn signals', 'Hazard lights'] },
  { key: 'fluids', label: 'Fluids', items: ['Engine oil', 'Coolant', 'Windshield washer'] },
  { key: 'exterior', label: 'Exterior', items: ['Body damage', 'Mirrors', 'Wipers', 'Windows'] },
  { key: 'interior', label: 'Interior', items: ['Seatbelts', 'Horn', 'Dashboard warnings', 'Fire extinguisher'] },
];

// TODO: Fetch checklist from database once inspection_checklists table is created
const INSPECTION_CHECKLIST = DEFAULT_INSPECTION_CHECKLIST;

const VehicleInspectionsTab = () => {
  const { inspections, loading, createInspection, deleteInspection } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [showInspectionDetail, setShowInspectionDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<VehicleInspection | null>(null);
  const [inspectionFilter, setInspectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newInspection, setNewInspection] = useState({
    vehicle_id: '',
    driver_id: '',
    inspection_type: 'pre_trip',
    odometer_km: 0,
    checklist_data: {} as Record<string, Record<string, boolean>>,
    defects_found: [] as string[],
    mechanic_notes: '',
    certified_safe: true,
  });

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Unknown";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending_repair':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertTriangle className="w-3 h-3 mr-1" />Needs Repair</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleChecklistChange = (category: string, item: string, checked: boolean) => {
    setNewInspection(prev => ({
      ...prev,
      checklist_data: {
        ...prev.checklist_data,
        [category]: {
          ...(prev.checklist_data[category] || {}),
          [item]: checked,
        },
      },
    }));
  };

  const handleSubmitInspection = async () => {
    const hasFailures = Object.values(newInspection.checklist_data).some(
      category => Object.values(category).some(v => v === false)
    );
    
    await createInspection({
      vehicle_id: newInspection.vehicle_id,
      driver_id: newInspection.driver_id || undefined,
      inspection_type: newInspection.inspection_type,
      inspection_date: new Date().toISOString(),
      odometer_km: newInspection.odometer_km || undefined,
      checklist_data: newInspection.checklist_data,
      defects_found: newInspection.defects_found.length > 0 ? { items: newInspection.defects_found } : undefined,
      mechanic_notes: newInspection.mechanic_notes || undefined,
      certified_safe: !hasFailures && newInspection.certified_safe,
      status: hasFailures ? 'failed' : 'passed',
    });
    
    setShowNewInspection(false);
    setNewInspection({
      vehicle_id: '',
      driver_id: '',
      inspection_type: 'pre_trip',
      odometer_km: 0,
      checklist_data: {},
      defects_found: [],
      mechanic_notes: '',
      certified_safe: true,
    });
  };

  const handleViewDetails = (inspection: VehicleInspection) => {
    setSelectedInspection(inspection);
    setShowInspectionDetail(true);
  };

  const handleDeleteClick = (inspection: VehicleInspection) => {
    setSelectedInspection(inspection);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedInspection) return;
    await deleteInspection(selectedInspection.id);
    setShowDeleteConfirm(false);
    setSelectedInspection(null);
  };

  // Filter inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter(i => {
      const matchesStatus = inspectionFilter === 'all' || i.status === inspectionFilter;
      const matchesSearch = searchQuery === '' || 
        getVehiclePlate(i.vehicle_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getDriverName(i.driver_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.inspection_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [inspections, inspectionFilter, searchQuery, vehicles, drivers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="inspection-search"
              aria-label="Search inspections"
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={inspectionFilter} onValueChange={setInspectionFilter}>
            <SelectTrigger className="w-40" aria-label="Filter inspections by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending_repair">Pending Repair</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowNewInspection(true)}
          aria-label="Create new vehicle inspection"
        >
          <Plus className="w-4 h-4" />
          New Inspection
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inspections.length}</div>
                <div className="text-sm text-muted-foreground">Total Inspections</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inspections.filter(i => i.status === 'passed').length}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inspections.filter(i => i.status === 'failed').length}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inspections.filter(i => i.status === 'pending_repair').length}</div>
                <div className="text-sm text-muted-foreground">Pending Repair</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{searchQuery || inspectionFilter !== 'all' ? "No inspections match your filters" : "No inspections found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInspections.map(inspection => (
            <Card key={inspection.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold">{getVehiclePlate(inspection.vehicle_id)}</span>
                      {getStatusBadge(inspection.status)}
                      <Badge variant="outline" className="capitalize">
                        {inspection.inspection_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(inspection.inspection_date), "MMM dd, yyyy HH:mm")}
                      </span>
                      {inspection.driver_id && (
                        <span>Inspector: {getDriverName(inspection.driver_id)}</span>
                      )}
                      {inspection.odometer_km && (
                        <span>{inspection.odometer_km.toLocaleString()} km</span>
                      )}
                    </div>

                    {inspection.defects_found && typeof inspection.defects_found === 'object' && (
                      <div className="text-sm text-destructive">
                        Defects: {(inspection.defects_found as any).items?.join(', ') || 'None reported'}
                      </div>
                    )}

                    {inspection.mechanic_notes && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        Notes: {inspection.mechanic_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {inspection.certified_safe ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Certified Safe
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Certified
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(inspection)}
                      aria-label={`View details for inspection on ${getVehiclePlate(inspection.vehicle_id)}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(inspection)}
                      aria-label={`Delete inspection for ${getVehiclePlate(inspection.vehicle_id)}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inspection Detail Dialog */}
      <Dialog open={showInspectionDetail} onOpenChange={setShowInspectionDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Inspection Details
            </DialogTitle>
            <DialogDescription>
              Full inspection record for {selectedInspection && getVehiclePlate(selectedInspection.vehicle_id)}
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Vehicle</label>
                  <p className="font-medium">{getVehiclePlate(selectedInspection.vehicle_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <p className="font-medium capitalize">{selectedInspection.inspection_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date</label>
                  <p className="font-medium">{format(new Date(selectedInspection.inspection_date), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Inspector</label>
                  <p className="font-medium">{getDriverName(selectedInspection.driver_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedInspection.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Odometer</label>
                  <p className="font-medium">{selectedInspection.odometer_km?.toLocaleString() || '-'} km</p>
                </div>
              </div>

              {selectedInspection.checklist_data && Object.keys(selectedInspection.checklist_data).length > 0 && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Checklist Results</label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(selectedInspection.checklist_data as Record<string, Record<string, boolean>>).map(([category, items]) => (
                      <div key={category} className="text-sm">
                        <span className="font-medium capitalize">{category}:</span>{' '}
                        {Object.entries(items).map(([item, passed]) => (
                          <span key={item} className={passed ? 'text-success' : 'text-destructive'}>
                            {item} {passed ? '✓' : '✗'}{' '}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInspection.mechanic_notes && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm">{selectedInspection.mechanic_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Inspection Dialog */}
      <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Vehicle Inspection</DialogTitle>
            <DialogDescription>
              Complete a pre-trip or post-trip vehicle inspection checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insp-vehicle">Vehicle</Label>
                <Select 
                  value={newInspection.vehicle_id}
                  onValueChange={v => setNewInspection({...newInspection, vehicle_id: v})}
                >
                  <SelectTrigger id="insp-vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number} - {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="insp-inspector">Inspector</Label>
                <Select 
                  value={newInspection.driver_id}
                  onValueChange={v => setNewInspection({...newInspection, driver_id: v})}
                >
                  <SelectTrigger id="insp-inspector">
                    <SelectValue placeholder="Select inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insp-type">Inspection Type</Label>
                <Select 
                  value={newInspection.inspection_type}
                  onValueChange={v => setNewInspection({...newInspection, inspection_type: v})}
                >
                  <SelectTrigger id="insp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_trip">Pre-Trip</SelectItem>
                    <SelectItem value="post_trip">Post-Trip</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="insp-odometer">Odometer (km)</Label>
                <Input 
                  id="insp-odometer"
                  type="number"
                  value={newInspection.odometer_km}
                  onChange={e => setNewInspection({...newInspection, odometer_km: Number(e.target.value)})}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Inspection Checklist</Label>
              {INSPECTION_CHECKLIST.map(category => (
                <Card key={category.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{category.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <Checkbox 
                            id={`${category.key}-${item}`}
                            checked={newInspection.checklist_data[category.key]?.[item] ?? true}
                            onCheckedChange={(checked) => handleChecklistChange(category.key, item, checked as boolean)}
                          />
                          <Label htmlFor={`${category.key}-${item}`} className="text-sm font-normal cursor-pointer">
                            {item}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Label htmlFor="insp-notes">Notes / Defects Found</Label>
              <Textarea 
                id="insp-notes"
                value={newInspection.mechanic_notes}
                onChange={e => setNewInspection({...newInspection, mechanic_notes: e.target.value})}
                placeholder="Describe any defects or issues found..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="certified_safe"
                checked={newInspection.certified_safe}
                onCheckedChange={(checked) => setNewInspection({...newInspection, certified_safe: checked as boolean})}
              />
              <Label htmlFor="certified_safe" className="cursor-pointer">
                I certify this vehicle is safe to operate
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInspection(false)}>Cancel</Button>
            <Button onClick={handleSubmitInspection} disabled={!newInspection.vehicle_id}>
              Submit Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleInspectionsTab;