import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Car, Search, Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Driver } from "@/hooks/useDrivers";
import { friendlyToastError } from "@/lib/errorMessages";

interface AssignVehicleToDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

interface VehicleRow {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  assigned_driver_id: string | null;
  drivers?: { first_name: string; last_name: string } | null;
}

export default function AssignVehicleToDriverDialog({ open, onOpenChange, driver }: AssignVehicleToDriverDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("none");
  const [search, setSearch] = useState("");

  // Fetch ALL org vehicles + the currently-assigned driver's name
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["assignable-vehicles", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as VehicleRow[];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, assigned_driver_id, drivers:assigned_driver_id(first_name, last_name)")
        .eq("organization_id", organizationId)
        .order("plate_number");
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!organizationId && open,
  });

  // Set current assignment when dialog opens
  useEffect(() => {
    if (!open) return;
    if (driver && vehicles.length > 0) {
      const current = vehicles.find(v => v.assigned_driver_id === driver.id);
      setSelectedVehicleId(current?.id || "none");
    } else {
      setSelectedVehicleId("none");
    }
    setSearch("");
  }, [driver, vehicles, open]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v =>
      v.plate_number?.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const assignMutation = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!driver) throw new Error("No driver selected");

      const { error: unassignError } = await supabase
        .from("vehicles")
        .update({ assigned_driver_id: null })
        .eq("assigned_driver_id", driver.id);
      if (unassignError) throw unassignError;

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
      queryClient.invalidateQueries({ queryKey: ["driver-vehicle-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-vehicles"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      friendlyToastError(error, { fallback: "Failed to assign vehicle" });
    },
  });

  const handleSubmit = () => {
    assignMutation.mutate(selectedVehicleId === "none" ? null : selectedVehicleId);
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Assign Vehicle
          </DialogTitle>
          <DialogDescription>
            Assign a vehicle to {driver.first_name} {driver.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate, make, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
              disabled={vehiclesLoading}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Unassign option */}
          <button
            onClick={() => setSelectedVehicleId("none")}
            className={cn(
              "w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border text-left transition-colors",
              selectedVehicleId === "none"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No Vehicle</p>
                <p className="text-xs text-muted-foreground">Unassign current vehicle</p>
              </div>
            </div>
            {selectedVehicleId === "none" && <Check className="h-4 w-4 text-primary" />}
          </button>

          {/* Vehicle list */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Available Vehicles ({filteredVehicles.length})
            </Label>
            <ScrollArea className="h-[280px] rounded-lg border">
              <div className="p-1.5 space-y-1">
                {vehiclesLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!vehiclesLoading && filteredVehicles.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No vehicles found
                  </div>
                )}
                {filteredVehicles.map((v) => {
                  const isCurrent = v.assigned_driver_id === driver.id;
                  const isAssignedToOther = !!v.assigned_driver_id && !isCurrent;
                  const isSelected = selectedVehicleId === v.id;
                  const otherName = v.drivers
                    ? `${v.drivers.first_name} ${v.drivers.last_name}`
                    : "another driver";

                  return (
                    <button
                      key={v.id}
                      onClick={() => !isAssignedToOther && setSelectedVehicleId(v.id)}
                      disabled={isAssignedToOther}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 p-2.5 rounded-md border text-left transition-colors",
                        isAssignedToOther && "opacity-60 cursor-not-allowed bg-muted/30",
                        !isAssignedToOther && isSelected && "border-primary bg-primary/5",
                        !isAssignedToOther && !isSelected && "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                          isAssignedToOther ? "bg-muted" : "bg-primary/10"
                        )}>
                          {isAssignedToOther ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Car className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.plate_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                            {isAssignedToOther && ` • Assigned to ${otherName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] h-5">Current</Badge>
                        )}
                        {isAssignedToOther && (
                          <Badge variant="outline" className="text-[10px] h-5 border-warning/40 text-warning">
                            Assigned
                          </Badge>
                        )}
                        {isSelected && !isAssignedToOther && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selectedVehicleId === "none" ? "Unassign" : "Save Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
