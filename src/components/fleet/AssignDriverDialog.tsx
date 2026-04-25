import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Car, ShieldAlert, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { friendlyToastError } from "@/lib/errorMessages";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    assignedDriver?: string;
    driverId?: string | null;
  } | null;
}

export default function AssignDriverDialog({ open, onOpenChange, vehicle }: AssignDriverDialogProps) {
  const { drivers } = useDrivers();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDriverId, setSelectedDriverId] = useState<string>("none");
  const [search, setSearch] = useState("");

  // Initialize selected driver when dialog opens
  useEffect(() => {
    if (open && vehicle) {
      setSelectedDriverId(vehicle.driverId || "none");
      setSearch("");
    }
  }, [open, vehicle]);

  // Lookup which other vehicles drivers are currently assigned to so we can
  // show conflict warnings and avoid silent re-assignment.
  const { data: driverAssignments = {} } = useQuery({
    queryKey: ["driver-vehicle-conflicts", organizationId],
    enabled: !!organizationId && open,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, assigned_driver_id")
        .eq("organization_id", organizationId!)
        .not("assigned_driver_id", "is", null);
      if (error) return {};
      const map: Record<string, { vehicleId: string; plate: string }> = {};
      (data || []).forEach((v: any) => {
        if (v.assigned_driver_id) map[v.assigned_driver_id] = { vehicleId: v.id, plate: v.plate_number };
      });
      return map;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (driverId: string | null) => {
      if (!vehicle?.vehicleId || !organizationId) throw new Error("Missing vehicle or organization");
      const { error } = await supabase
        .from("vehicles")
        .update({ assigned_driver_id: driverId })
        .eq("id", vehicle.vehicleId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: selectedDriverId === "none"
          ? "Driver unassigned from vehicle"
          : "Driver assigned to vehicle successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-profile"] });
      queryClient.invalidateQueries({ queryKey: ["driver-vehicle-conflicts"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      friendlyToastError(error, { fallback: "Failed to assign driver" });
    },
  });

  // Active drivers, filtered by search, with verified ones first.
  const activeDrivers = drivers
    .filter(d => d.status === 'active')
    .filter(d => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.license_number ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = (a as any).verification_status === 'verified' ? 0 : 1;
      const bv = (b as any).verification_status === 'verified' ? 0 : 1;
      return av - bv;
    });

  const selectedDriver = activeDrivers.find(d => d.id === selectedDriverId)
    ?? drivers.find(d => d.id === selectedDriverId);
  const selectedIsVerified = !selectedDriver || (selectedDriver as any).verification_status === 'verified';
  const isUnassigning = selectedDriverId === "none";
  const conflict = !isUnassigning && selectedDriver
    ? (driverAssignments as Record<string, { vehicleId: string; plate: string }>)[selectedDriverId]
    : undefined;
  // True conflict only if driver is currently on a *different* vehicle.
  const hasConflict = !!conflict && conflict.vehicleId !== vehicle?.vehicleId;

  const handleSubmit = () => {
    // Hard-block: cannot assign a driver who hasn't been verified.
    if (!isUnassigning && !selectedIsVerified) {
      toast({
        title: "Driver not verified",
        description: "This driver's identity and license must be verified before they can be assigned to a vehicle.",
        variant: "destructive",
      });
      return;
    }
    const driverId = isUnassigning ? null : selectedDriverId;
    assignMutation.mutate(driverId);
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Assign Driver
          </DialogTitle>
          <DialogDescription>
            Assign or change the driver for this vehicle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{vehicle.plate}</p>
              <p className="text-sm text-muted-foreground">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>

          {vehicle.assignedDriver && (
            <div className="text-sm text-muted-foreground">
              Currently assigned to: <span className="font-medium text-foreground">{vehicle.assignedDriver}</span>
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="driver-search">Search</Label>
            <Input
              id="driver-search"
              placeholder="Name, license # or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label>Select Driver</Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No driver assigned</span>
                </SelectItem>
                {activeDrivers.map((driver) => {
                  const isVerified = (driver as any).verification_status === 'verified';
                  const busyOn = (driverAssignments as any)[driver.id];
                  const busyElsewhere = busyOn && busyOn.vehicleId !== vehicle?.vehicleId;
                  return (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {driver.first_name[0]}{driver.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{driver.first_name} {driver.last_name}</span>
                        <span className="text-muted-foreground text-xs">- {driver.license_number}</span>
                        {busyElsewhere && (
                          <Badge variant="outline" className="ml-auto gap-1 border-warning/40 text-warning text-[10px] py-0">
                            On {busyOn.plate}
                          </Badge>
                        )}
                        {!busyElsewhere && (isVerified ? (
                          <Badge variant="outline" className="ml-auto gap-1 border-success/40 text-success text-[10px] py-0">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="ml-auto gap-1 border-warning/40 text-warning text-[10px] py-0">
                            <ShieldAlert className="w-3 h-3" /> Unverified
                          </Badge>
                        ))}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Conflict warning: driver already on another vehicle */}
          {hasConflict && conflict && (
            <Alert className="py-2 border-warning/40 bg-warning/5">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs">
                <strong>{selectedDriver?.first_name} {selectedDriver?.last_name}</strong> is currently
                assigned to vehicle <span className="font-mono font-medium">{conflict.plate}</span>.
                Confirming will move them to this vehicle.
              </AlertDescription>
            </Alert>
          )}

          {/* Hard-block: warn when an unverified driver is selected */}
          {!isUnassigning && selectedDriver && !selectedIsVerified && (
            <Alert variant="destructive" className="py-2">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>{selectedDriver.first_name} {selectedDriver.last_name}</strong> has not been verified.
                Verify identity and license in the driver profile before assigning to a vehicle.
              </AlertDescription>
            </Alert>
          )}

          {activeDrivers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {search ? "No drivers match your search." : "No active drivers available. Add drivers in the Drivers page."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignMutation.isPending || (!isUnassigning && !!selectedDriver && !selectedIsVerified)}
          >
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUnassigning ? "Unassign Driver" : "Assign Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
