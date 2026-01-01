import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Radio, Wifi, WifiOff, Search } from "lucide-react";

interface GPSDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
  } | null;
  onSuccess?: () => void;
}

interface Device {
  id: string;
  imei: string;
  tracker_model: string;
  status: string;
  vehicle_id: string | null;
  last_heartbeat: string | null;
}

export const GPSDeviceDialog = ({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: GPSDeviceDialogProps) => {
  const { organizationId } = useOrganization();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (open && organizationId) {
      fetchDevices();
      if (vehicle) {
        fetchCurrentDevice();
      }
    }
  }, [open, organizationId, vehicle]);

  const fetchDevices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("organization_id", organizationId)
      .is("vehicle_id", null) // Only show unassigned devices
      .order("imei");

    if (!error && data) {
      setDevices(data as Device[]);
    }
    setLoading(false);
  };

  const fetchCurrentDevice = async () => {
    if (!vehicle) return;
    
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("vehicle_id", vehicle.vehicleId)
      .maybeSingle();

    if (!error && data) {
      setCurrentDevice(data as Device);
    } else {
      setCurrentDevice(null);
    }
  };

  const handleAssignDevice = async () => {
    if (!vehicle || !selectedDeviceId) return;

    setSaving(true);

    // If there's a current device, unassign it first
    if (currentDevice) {
      await supabase
        .from("devices")
        .update({ vehicle_id: null })
        .eq("id", currentDevice.id);
    }

    // Assign the new device
    const { error } = await supabase
      .from("devices")
      .update({ vehicle_id: vehicle.vehicleId })
      .eq("id", selectedDeviceId);

    if (error) {
      toast.error("Failed to assign device", { description: error.message });
    } else {
      toast.success("GPS device assigned", {
        description: `Device assigned to ${vehicle.plate}`,
      });
      onSuccess?.();
      onOpenChange(false);
    }

    setSaving(false);
  };

  const handleUnassignDevice = async () => {
    if (!currentDevice) return;

    setSaving(true);

    const { error } = await supabase
      .from("devices")
      .update({ vehicle_id: null })
      .eq("id", currentDevice.id);

    if (error) {
      toast.error("Failed to unassign device", { description: error.message });
    } else {
      toast.success("GPS device unassigned", {
        description: `Device removed from ${vehicle?.plate}`,
      });
      setCurrentDevice(null);
      fetchDevices();
    }

    setSaving(false);
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tracker_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOnline = (device: Device) => {
    if (!device.last_heartbeat) return false;
    const lastSeen = new Date(device.last_heartbeat);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastSeen > fiveMinutesAgo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            GPS Device Assignment
          </DialogTitle>
          <DialogDescription>
            {vehicle && (
              <>
                Assign or change the GPS device for{" "}
                <strong>{vehicle.plate}</strong> ({vehicle.make} {vehicle.model})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Device */}
          {currentDevice && (
            <div className="space-y-2">
              <Label>Currently Assigned Device</Label>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  {isOnline(currentDevice) ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{currentDevice.imei}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentDevice.tracker_model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isOnline(currentDevice) ? "default" : "secondary"}>
                    {isOnline(currentDevice) ? "Online" : "Offline"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnassignDevice}
                    disabled={saving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Assign New Device */}
          <div className="space-y-3">
            <Label>
              {currentDevice ? "Replace with Device" : "Select Device to Assign"}
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by IMEI or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-6 text-muted-foreground">
                Loading devices...
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {devices.length === 0
                  ? "No unassigned devices available"
                  : "No devices match your search"}
              </div>
            ) : (
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      <div className="flex items-center gap-2">
                        {isOnline(device) ? (
                          <Wifi className="w-3 h-3 text-success" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="font-mono">{device.imei}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">
                          {device.tracker_model}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignDevice}
            disabled={saving || !selectedDeviceId}
          >
            {saving ? "Assigning..." : "Assign Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};