import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Loader2, User, Car } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    assignedDriver?: string;
  } | null;
}

export default function AssignDriverDialog({ open, onOpenChange, vehicle }: AssignDriverDialogProps) {
  const { drivers } = useDrivers();
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDriverId, setSelectedDriverId] = useState<string>("none");

  const assignMutation = useMutation({
    mutationFn: async (driverId: string | null) => {
      if (!vehicle?.vehicleId || !organizationId) throw new Error("Missing vehicle or organization");

      // Create a trip assignment to link driver to vehicle
      if (driverId) {
        const { error } = await supabase
          .from("trips")
          .insert({
            organization_id: organizationId,
            vehicle_id: vehicle.vehicleId,
            driver_id: driverId,
            start_time: new Date().toISOString(),
            status: "assigned",
            notes: "Driver assigned to vehicle",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: selectedDriverId === "none" 
          ? "Driver unassigned from vehicle" 
          : "Driver assigned to vehicle successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign driver",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const driverId = selectedDriverId === "none" ? null : selectedDriverId;
    assignMutation.mutate(driverId);
  };

  const activeDrivers = drivers.filter(d => d.status === 'active');

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
                {activeDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {driver.first_name[0]}{driver.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{driver.first_name} {driver.last_name}</span>
                      <span className="text-muted-foreground text-xs">- {driver.license_number}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeDrivers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No active drivers available. Add drivers in the Drivers page.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
