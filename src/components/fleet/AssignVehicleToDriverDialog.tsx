import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Car } from "lucide-react";
import type { Driver } from "@/hooks/useDrivers";

interface AssignVehicleToDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

export default function AssignVehicleToDriverDialog({ open, onOpenChange, driver }: AssignVehicleToDriverDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Fetch available vehicles (not assigned or assigned to this driver)
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["available-vehicles-for-driver", organizationId, driver?.id],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, assigned_driver_id")
        .eq("organization_id", organizationId)
        .or(`assigned_driver_id.is.null,assigned_driver_id.eq.${driver?.id || "00000000-0000-0000-0000-000000000000"}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  // Set current assignment
  useEffect(() => {
    if (driver && vehicles.length > 0) {
      const currentVehicle = vehicles.find(v => v.assigned_driver_id === driver.id);
      setSelectedVehicleId(currentVehicle?.id || "none");
    }
  }, [driver, vehicles]);

  const assignMutation = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!driver) throw new Error("No driver selected");

      // First, unassign driver from any current vehicle
      const { error: unassignError } = await supabase
        .from("vehicles")
        .update({ assigned_driver_id: null })
        .eq("assigned_driver_id", driver.id);

      if (unassignError) throw unassignError;

      // If assigning to a new vehicle
      if (vehicleId && vehicleId !== "none") {
        const { error: assignError } = await supabase
          .from("vehicles")
          .update({ assigned_driver_id: driver.id })
          .eq("id", vehicleId);

        if (assignError) throw assignError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: selectedVehicleId === "none" 
          ? "Driver unassigned from vehicle" 
          : "Vehicle assigned to driver",
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["driver-vehicle"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign vehicle",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    assignMutation.mutate(selectedVehicleId === "none" ? null : selectedVehicleId);
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Assign Vehicle
          </DialogTitle>
          <DialogDescription>
            Assign a vehicle to {driver.first_name} {driver.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Vehicle</Label>
            <Select 
              value={selectedVehicleId} 
              onValueChange={setSelectedVehicleId}
              disabled={vehiclesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Vehicle (Unassign)</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    {vehicle.assigned_driver_id === driver.id && " (Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selectedVehicleId === "none" ? "Unassign" : "Assign Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
