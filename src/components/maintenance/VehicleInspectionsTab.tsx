import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Truck
} from "lucide-react";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const INSPECTION_CHECKLIST = [
  { key: 'tires', label: 'Tires & Wheels', items: ['Tire pressure', 'Tread depth', 'Wheel nuts'] },
  { key: 'brakes', label: 'Brakes', items: ['Brake fluid level', 'Brake pads', 'Parking brake'] },
  { key: 'lights', label: 'Lights & Signals', items: ['Headlights', 'Tail lights', 'Turn signals', 'Hazard lights'] },
  { key: 'fluids', label: 'Fluids', items: ['Engine oil', 'Coolant', 'Windshield washer'] },
  { key: 'exterior', label: 'Exterior', items: ['Body damage', 'Mirrors', 'Wipers', 'Windows'] },
  { key: 'interior', label: 'Interior', items: ['Seatbelts', 'Horn', 'Dashboard warnings', 'Fire extinguisher'] },
];

const VehicleInspectionsTab = () => {
  const { inspections, loading, createInspection } = useMaintenanceSchedules();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [inspectionFilter, setInspectionFilter] = useState<string>("all");

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

  const filteredInspections = inspections.filter(i => {
    if (inspectionFilter === 'all') return true;
    return i.status === inspectionFilter;
  });

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
      <div className="flex justify-between items-center">
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
            <p>No inspections found</p>
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
                      <div className="text-sm text-muted-foreground">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Inspection Dialog */}
      <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="inspection-dialog-description">
          <DialogHeader>
            <DialogTitle>New Vehicle Inspection</DialogTitle>
            <p id="inspection-dialog-description" className="text-sm text-muted-foreground">
              Complete a pre-trip or post-trip vehicle inspection checklist.
            </p>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle</Label>
                <Select 
                  value={newInspection.vehicle_id}
                  onValueChange={v => setNewInspection({...newInspection, vehicle_id: v})}
                >
                  <SelectTrigger>
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
                <Label>Inspector</Label>
                <Select 
                  value={newInspection.driver_id}
                  onValueChange={v => setNewInspection({...newInspection, driver_id: v})}
                >
                  <SelectTrigger>
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
                <Label>Inspection Type</Label>
                <Select 
                  value={newInspection.inspection_type}
                  onValueChange={v => setNewInspection({...newInspection, inspection_type: v})}
                >
                  <SelectTrigger>
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
                <Label>Odometer (km)</Label>
                <Input 
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
              <Label>Notes / Defects Found</Label>
              <Textarea 
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
    </div>
  );
};

export default VehicleInspectionsTab;
