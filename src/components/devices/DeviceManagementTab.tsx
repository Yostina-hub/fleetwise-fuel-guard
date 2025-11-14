import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDevices } from "@/hooks/useDevices";
import { useVehicles } from "@/hooks/useVehicles";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Activity, 
  Signal, 
  Smartphone,
  CircleDot,
  WifiOff,
  Wifi
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const DeviceManagementTab = () => {
  const { devices, isLoading, createDevice, updateDevice, deleteDevice, testHeartbeat } = useDevices();
  const { vehicles } = useVehicles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSubmit = () => {
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
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      case "maintenance": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const isDeviceOnline = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return false;
    const lastComm = new Date(lastHeartbeat);
    const now = new Date();
    const minutesSince = (now.getTime() - lastComm.getTime()) / 1000 / 60;
    return minutesSince <= 5;
  };

  const filteredDevices = devices?.filter(device => 
    searchQuery === "" ||
    device.imei?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.sim_msisdn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.tracker_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading devices...</div>;
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
                <Label htmlFor="vehicle">Vehicle</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracker_model">Tracker Model *</Label>
                <Input
                  id="tracker_model"
                  value={formData.tracker_model}
                  onChange={(e) => setFormData({ ...formData, tracker_model: e.target.value })}
                  placeholder="YTWL CA100F Speed Governor"
                  required
                />
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
            <div className="text-2xl font-bold text-green-600">
              {devices?.filter(d => isDeviceOnline(d.last_heartbeat)).length || 0}
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
              {devices?.filter(d => d.status === 'active').length || 0}
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
            <div className="text-2xl font-bold text-orange-600">
              {devices?.filter(d => d.status === 'maintenance').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by IMEI, SIM, model, or vehicle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>GPS Devices</CardTitle>
          <CardDescription>All registered tracking devices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
              {filteredDevices?.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Badge className={getStatusColor(device.status)}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {device.vehicles?.plate_number || "Unassigned"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {device.imei}
                  </TableCell>
                  <TableCell>{device.tracker_model}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      {device.sim_msisdn || "No SIM"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {device.last_heartbeat ? (
                        <>
                          <div className="flex items-center gap-2">
                            {isDeviceOnline(device.last_heartbeat) ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isDeviceOnline(device.last_heartbeat) ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
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
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(device)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this device?")) {
                            deleteDevice.mutate(device.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDevices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No devices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
