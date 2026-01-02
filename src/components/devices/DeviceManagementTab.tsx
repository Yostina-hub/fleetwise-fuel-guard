import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useDevices } from "@/hooks/useDevices";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Activity, 
  Signal, 
  Smartphone,
  WifiOff,
  Wifi,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Car
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ITEMS_PER_PAGE = 10;

// Helper to escape CSV values
const escapeCSV = (value: string | null | undefined): string => {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const DeviceManagementTab = () => {
  const { devices, isLoading, createDevice, updateDevice, deleteDevice, testHeartbeat } = useDevices();
  const { vehicles } = useVehicles();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<any>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [quickAssignDialogOpen, setQuickAssignDialogOpen] = useState(false);
  const [deviceToAssign, setDeviceToAssign] = useState<any>(null);
  const [assignVehicleId, setAssignVehicleId] = useState("none");

  const [formData, setFormData] = useState({
    vehicle_id: "",
    imei: "",
    tracker_model: "",
    serial_number: "",
    sim_msisdn: "",
    sim_iccid: "",
    apn: "",
    status: "active" as "active" | "inactive" | "maintenance",
    firmware_version: "",
    install_date: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Real-time subscription is already handled by useDevices hook

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedDevices([]); // Clear selection when filters change
  }, [searchQuery, statusFilter]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.imei.trim()) {
      errors.imei = "IMEI is required";
    } else if (!/^\d{15}$/.test(formData.imei.trim())) {
      errors.imei = "IMEI must be exactly 15 digits";
    } else {
      // Check for duplicate IMEI (only when creating new device or IMEI changed)
      const existingDevice = devices?.find(d => 
        d.imei === formData.imei.trim() && d.id !== editingDevice?.id
      );
      if (existingDevice) {
        errors.imei = "A device with this IMEI already exists";
      }
    }
    
    if (!formData.tracker_model.trim()) {
      errors.tracker_model = "Tracker model is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.imei, formData.tracker_model, devices, editingDevice]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    // If selecting a vehicle that's assigned to another device, unassign it first
    if (formData.vehicle_id) {
      const assignedDevice = devices?.find(d => d.vehicle_id === formData.vehicle_id && d.id !== editingDevice?.id);
      if (assignedDevice) {
        await supabase.from("devices").update({ vehicle_id: null }).eq("id", assignedDevice.id);
      }
    }

    if (editingDevice) {
      updateDevice.mutate({ id: editingDevice.id, ...formData });
    } else {
      createDevice.mutate(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      imei: "",
      tracker_model: "",
      serial_number: "",
      sim_msisdn: "",
      sim_iccid: "",
      apn: "",
      status: "active",
      firmware_version: "",
      install_date: "",
      notes: "",
    });
    setFormErrors({});
    setEditingDevice(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (device: any) => {
    setEditingDevice(device);
    setFormData({
      vehicle_id: device.vehicle_id || "",
      imei: device.imei || "",
      tracker_model: device.tracker_model || "",
      serial_number: device.serial_number || "",
      sim_msisdn: device.sim_msisdn || "",
      sim_iccid: device.sim_iccid || "",
      apn: device.apn || "",
      status: device.status || "active",
      firmware_version: device.firmware_version || "",
      install_date: device.install_date || "",
      notes: device.notes || "",
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (device: any) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      deleteDevice.mutate(deviceToDelete.id);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    const deletePromises = selectedDevices.map(id => 
      supabase.from("devices").delete().eq("id", id)
    );
    
    try {
      await Promise.all(deletePromises);
      // Invalidate queries to refresh device list - useDevices uses ["devices"] as base key
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Devices Deleted",
        description: `${selectedDevices.length} devices have been deleted`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Some devices could not be deleted",
        variant: "destructive",
      });
    }
    
    setSelectedDevices([]);
    setBulkDeleteDialogOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevices(paginatedDevices.map(d => d.id));
    } else {
      setSelectedDevices([]);
    }
  };

  const handleSelectDevice = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices(prev => [...prev, deviceId]);
    } else {
      setSelectedDevices(prev => prev.filter(id => id !== deviceId));
    }
  };

  const handleQuickAssign = (device: any) => {
    setDeviceToAssign(device);
    setAssignVehicleId(device.vehicle_id || "none");
    setQuickAssignDialogOpen(true);
  };

  const confirmQuickAssign = async () => {
    if (deviceToAssign) {
      const selectedVehicleId = assignVehicleId === "none" ? null : assignVehicleId;
      
      // If vehicle is assigned to another device, unassign it first
      if (selectedVehicleId) {
        const assignedDevice = devices?.find(d => d.vehicle_id === selectedVehicleId && d.id !== deviceToAssign.id);
        if (assignedDevice) {
          // Unassign from the other device first
          await supabase.from("devices").update({ vehicle_id: null }).eq("id", assignedDevice.id);
        }
      }
      
      updateDevice.mutate({ 
        id: deviceToAssign.id, 
        vehicle_id: selectedVehicleId 
      });
      setQuickAssignDialogOpen(false);
      setDeviceToAssign(null);
      setAssignVehicleId("none");
    }
  };

  const exportToCSV = () => {
    if (!filteredDevices || filteredDevices.length === 0) {
      toast({
        title: "No Data",
        description: "No devices to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Status", "Vehicle", "IMEI", "Tracker Model", "SIM Card", "Last Heartbeat", "Connection"];
    const rows = filteredDevices.map(device => [
      escapeCSV(device.status),
      escapeCSV(device.vehicles?.plate_number || "Unassigned"),
      escapeCSV(device.imei),
      escapeCSV(device.tracker_model),
      escapeCSV(device.sim_msisdn || "No SIM"),
      device.last_heartbeat ? new Date(device.last_heartbeat).toISOString() : "Never",
      isDeviceOnline(device.last_heartbeat) ? "Online" : "Offline"
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devices-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredDevices.length} devices to CSV`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
      case "inactive": return "bg-muted text-muted-foreground border-border";
      case "maintenance": return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const isDeviceOnline = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return false;
    const lastComm = new Date(lastHeartbeat);
    const now = new Date();
    const minutesSince = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    return minutesSince <= 5;
  };

  const filteredDevices = useMemo(() => {
    return devices?.filter(device => {
      const matchesSearch = searchQuery === "" ||
        device.imei?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.sim_msisdn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.tracker_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || device.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }) || [];
  }, [devices, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Clear selection when page changes
  useEffect(() => {
    setSelectedDevices([]);
  }, [currentPage]);

  const onlineCount = devices?.filter(d => isDeviceOnline(d.last_heartbeat)).length || 0;
  const activeCount = devices?.filter(d => d.status === 'active').length || 0;
  const maintenanceCount = devices?.filter(d => d.status === 'maintenance').length || 0;

  // Get vehicles with assignment status - unassigned first, then assigned
  const vehiclesWithAssignmentStatus = useMemo(() => {
    if (!vehicles) return { unassigned: [], assigned: [] };
    
    // Get map of vehicle_id -> device info for assigned vehicles
    const vehicleAssignments = new Map<string, { deviceId: string; imei: string }>();
    devices?.forEach(d => {
      if (d.vehicle_id) {
        vehicleAssignments.set(d.vehicle_id, { deviceId: d.id, imei: d.imei });
      }
    });
    
    const unassigned: typeof vehicles = [];
    const assigned: (typeof vehicles[0] & { assignedToDevice: { deviceId: string; imei: string } })[] = [];
    
    vehicles.forEach(v => {
      const assignment = vehicleAssignments.get(v.id);
      if (assignment) {
        // Skip if assigned to current device being edited/assigned
        if (assignment.deviceId === editingDevice?.id || assignment.deviceId === deviceToAssign?.id) {
          unassigned.push(v); // Treat as available for current device
        } else {
          assigned.push({ ...v, assignedToDevice: assignment });
        }
      } else {
        unassigned.push(v);
      }
    });
    
    return { unassigned, assigned };
  }, [vehicles, devices, editingDevice, deviceToAssign]);

  // For backward compatibility
  const availableVehicles = vehiclesWithAssignmentStatus.unassigned;

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading devices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-muted-foreground">
            Manage GPS trackers, SIM cards, and device configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDevice ? "Edit" : "Add"} Device</DialogTitle>
                <DialogDescription>
                  Configure GPS tracker device with SIM card and connection details
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle (Plate Number)</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle by plate number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No vehicle assigned</span>
                      </SelectItem>
                      {vehiclesWithAssignmentStatus.unassigned.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded mx-1 my-1">
                            Available Vehicles ({vehiclesWithAssignmentStatus.unassigned.length})
                          </div>
                          {vehiclesWithAssignmentStatus.unassigned.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{vehicle.plate_number}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {vehiclesWithAssignmentStatus.assigned.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded mx-1 my-1 mt-2">
                            Assigned to Other Devices ({vehiclesWithAssignmentStatus.assigned.length})
                          </div>
                          {vehiclesWithAssignmentStatus.assigned.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id} className="text-amber-600 dark:text-amber-400">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{vehicle.plate_number}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                                {vehicle.assignedToDevice.imei && (
                                  <Badge variant="outline" className="text-[10px] h-5 ml-1">
                                    IMEI: ...{vehicle.assignedToDevice.imei.slice(-6)}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {formData.vehicle_id && formData.vehicle_id !== "" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        const selected = [...vehiclesWithAssignmentStatus.unassigned, ...vehiclesWithAssignmentStatus.assigned].find(v => v.id === formData.vehicle_id);
                        return selected ? `Selected: ${selected.plate_number}` : null;
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imei">IMEI Number *</Label>
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    placeholder="355442200988256"
                    className={formErrors.imei ? "border-destructive" : ""}
                  />
                  {formErrors.imei && (
                    <p className="text-xs text-destructive">{formErrors.imei}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracker_model">Tracker Model *</Label>
                  <Input
                    id="tracker_model"
                    value={formData.tracker_model}
                    onChange={(e) => setFormData({ ...formData, tracker_model: e.target.value })}
                    placeholder="YTWL CA100F Speed Governor"
                    className={formErrors.tracker_model ? "border-destructive" : ""}
                  />
                  {formErrors.tracker_model && (
                    <p className="text-xs text-destructive">{formErrors.tracker_model}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="SN123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmware_version">Firmware Version</Label>
                  <Input
                    id="firmware_version"
                    value={formData.firmware_version}
                    onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                    placeholder="v2.1.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sim_msisdn">SIM Card Number (MSISDN)</Label>
                  <Input
                    id="sim_msisdn"
                    value={formData.sim_msisdn}
                    onChange={(e) => setFormData({ ...formData, sim_msisdn: e.target.value })}
                    placeholder="+251980888379"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sim_iccid">SIM ICCID</Label>
                  <Input
                    id="sim_iccid"
                    value={formData.sim_iccid}
                    onChange={(e) => setFormData({ ...formData, sim_iccid: e.target.value })}
                    placeholder="89251234567890123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apn">APN</Label>
                  <Input
                    id="apn"
                    value={formData.apn}
                    onChange={(e) => setFormData({ ...formData, apn: e.target.value })}
                    placeholder="internet.ethionet.et"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="install_date">Install Date</Label>
                  <Input
                    id="install_date"
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional device notes..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingDevice ? "Update" : "Create"} Device
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {onlineCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {maintenanceCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedDevices.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedDevices.length} device(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDevices([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by IMEI, SIM, model, or vehicle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>GPS Devices</CardTitle>
          <CardDescription>
            Showing {paginatedDevices.length} of {filteredDevices.length} devices
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedDevices.length > 0 && selectedDevices.length === paginatedDevices.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Tracker Model</TableHead>
                <TableHead>SIM Card</TableHead>
                <TableHead>Heartbeat</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={(checked) => handleSelectDevice(device.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(device.status)}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {device.vehicles?.plate_number ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-semibold text-sm px-2 py-1">
                          {device.vehicles.plate_number}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => handleQuickAssign(device)}
                          title="Change vehicle"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => handleQuickAssign(device)}
                      >
                        <Car className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {device.imei}
                  </TableCell>
                  <TableCell>{device.tracker_model}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      {device.sim_msisdn || <span className="text-muted-foreground">No SIM</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {device.last_heartbeat ? (
                        <div className="flex items-center gap-2">
                          {isDeviceOnline(device.last_heartbeat) ? (
                            <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isDeviceOnline(device.last_heartbeat) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                        <Signal className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Offline
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testHeartbeat.mutate(device.id)}
                        disabled={testHeartbeat.isPending}
                        title={device.vehicle_id ? "Test Heartbeat" : "Assign to vehicle first"}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(device)}
                        title="Edit Device"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(device)}
                        title="Delete Device"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {filteredDevices.length === 0 && devices?.length ? 
                      "No devices match your filters" : 
                      "No devices found. Click 'Add Device' to add your first GPS tracker."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the device with IMEI{" "}
              <span className="font-mono font-semibold">{deviceToDelete?.imei}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDevices.length} Devices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDevices.length} selected devices?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Assign Vehicle Dialog */}
      <Dialog open={quickAssignDialogOpen} onOpenChange={setQuickAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle to Device</DialogTitle>
            <DialogDescription>
              Assign a vehicle to device IMEI: <span className="font-mono font-semibold">{deviceToAssign?.imei}</span>
              {deviceToAssign?.sim_msisdn && (
                <span className="block mt-1">
                  SIM: <span className="font-mono">{deviceToAssign.sim_msisdn}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Current Assignment Display */}
          {deviceToAssign?.vehicles?.plate_number && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Currently Assigned</p>
              <p className="font-semibold text-lg">{deviceToAssign.vehicles.plate_number}</p>
              <p className="text-sm text-muted-foreground">
                {deviceToAssign.vehicles.make} {deviceToAssign.vehicles.model}
              </p>
            </div>
          )}
          
          <div className="py-2">
            <Label htmlFor="assign-vehicle">Select Vehicle</Label>
            <Select
              value={assignVehicleId}
              onValueChange={setAssignVehicleId}
            >
              <SelectTrigger id="assign-vehicle" className="mt-1.5">
                <SelectValue placeholder="Select vehicle by plate number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No vehicle assigned</span>
                </SelectItem>
                {vehiclesWithAssignmentStatus.unassigned.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded mx-1 my-1">
                      Available Vehicles ({vehiclesWithAssignmentStatus.unassigned.length})
                    </div>
                    {vehiclesWithAssignmentStatus.unassigned.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{vehicle.plate_number}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {vehiclesWithAssignmentStatus.assigned.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded mx-1 my-1 mt-2">
                      Assigned to Other Devices ({vehiclesWithAssignmentStatus.assigned.length})
                    </div>
                    {vehiclesWithAssignmentStatus.assigned.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id} className="text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{vehicle.plate_number}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                          <Badge variant="outline" className="text-[10px] h-5 ml-1">
                            IMEI: ...{vehicle.assignedToDevice.imei.slice(-6)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            
            {/* Selected vehicle preview */}
            {assignVehicleId && assignVehicleId !== "none" && (
              <div className="mt-3 rounded-lg border p-3 bg-primary/5">
                {(() => {
                  const selectedVehicle = [...vehiclesWithAssignmentStatus.unassigned, ...vehiclesWithAssignmentStatus.assigned].find(v => v.id === assignVehicleId);
                  const isReassigning = vehiclesWithAssignmentStatus.assigned.some(v => v.id === assignVehicleId);
                  return selectedVehicle ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">
                        {isReassigning ? "Will reassign from another device" : "Will assign"}
                      </p>
                      <p className="font-mono font-bold text-xl">{selectedVehicle.plate_number}</p>
                      <p className="text-sm text-muted-foreground">{selectedVehicle.make} {selectedVehicle.model}</p>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmQuickAssign}
              variant={vehiclesWithAssignmentStatus.assigned.some(v => v.id === assignVehicleId) ? "default" : "default"}
              className={vehiclesWithAssignmentStatus.assigned.some(v => v.id === assignVehicleId) ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {vehiclesWithAssignmentStatus.assigned.some(v => v.id === assignVehicleId) ? "Reassign Vehicle" : "Assign Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
