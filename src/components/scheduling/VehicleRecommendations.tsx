import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Truck, Fuel, MapPin, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleRecommendationsProps {
  requestId: string;
  pickupAt: string;
  returnAt: string;
  requiredClass?: string;
  passengers: number;
  pickupGeofenceId?: string;
}

interface VehicleScore {
  vehicle: any;
  driver?: any;
  score: number;
  breakdown: {
    availability: number;
    proximity: number;
    fuelLevel: number;
    utilization: number;
    maintenance: number;
  };
  conflicts: string[];
  warnings: string[];
}

export const VehicleRecommendations = ({
  requestId,
  pickupAt,
  returnAt,
  requiredClass,
  passengers,
  pickupGeofenceId,
}: VehicleRecommendationsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleScore | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // Fetch recommendations
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["vehicle-recommendations", requestId, pickupAt, returnAt],
    queryFn: async () => {
      // Fetch all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles" as any)
        .select("*")
        .eq("status", "active");

      if (vehiclesError) throw vehiclesError;

      // Fetch calendar conflicts
      const { data: vehicleCalendar } = await supabase
        .from("vehicle_calendar" as any)
        .select("*")
        .gte("window_end", pickupAt)
        .lte("window_start", returnAt);

      // Fetch pickup location
      let pickupLat = 0, pickupLng = 0;
      if (pickupGeofenceId) {
        const { data: geofence } = await supabase
          .from("geofences")
          .select("center_lat, center_lng")
          .eq("id", pickupGeofenceId)
          .single();
        
        if (geofence) {
          pickupLat = parseFloat(geofence.center_lat?.toString() || "0");
          pickupLng = parseFloat(geofence.center_lng?.toString() || "0");
        }
      }

      // Fetch available drivers
      const { data: drivers } = await supabase
        .from("drivers")
        .select("*")
        .eq("status", "active");

      // Score each vehicle
      const scored: VehicleScore[] = (vehicles || []).map((vehicle: any) => {
        const conflicts: string[] = [];
        const warnings: string[] = [];
        
        // Check availability (calendar conflicts)
        const hasConflict = vehicleCalendar?.some(
          (entry: any) => entry.vehicle_id === vehicle.id && 
          ['trip', 'maintenance'].includes(entry.entry_type)
        );
        
        const availabilityScore = hasConflict ? 0 : 100;
        if (hasConflict) conflicts.push("Vehicle is scheduled during this time");

        // Check vehicle class match
        let classScore = 100;
        if (requiredClass && vehicle.vehicle_class !== requiredClass) {
          classScore = 50;
          warnings.push("Vehicle class doesn't match requirement");
        }

        // Calculate proximity score (simplified - in reality would use actual GPS)
        const proximityScore = pickupLat && pickupLng ? 80 : 50;

        // Fuel level score (assuming we have this data)
        const fuelScore = 85; // Placeholder

        // Utilization score (prefer balanced utilization)
        const utilizationScore = 70; // Placeholder

        // Maintenance score (check if maintenance is due soon)
        const maintenanceScore = 90; // Placeholder

        // Calculate weighted total score
        const score = availabilityScore === 0 ? 0 : (
          availabilityScore * 0.35 +
          proximityScore * 0.20 +
          fuelScore * 0.15 +
          utilizationScore * 0.15 +
          maintenanceScore * 0.10 +
          classScore * 0.05
        );

        return {
          vehicle,
          score: Math.round(score),
          breakdown: {
            availability: availabilityScore,
            proximity: proximityScore,
            fuelLevel: fuelScore,
            utilization: utilizationScore,
            maintenance: maintenanceScore,
          },
          conflicts,
          warnings,
        };
      });

      // Sort by score (highest first)
      return scored.sort((a, b) => b.score - a.score).slice(0, 10);
    },
  });

  // Fetch drivers for selected vehicle
  const { data: availableDrivers } = useQuery({
    queryKey: ["available-drivers", pickupAt, returnAt],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("status", "active");

      if (error) throw error;

      // Filter out drivers with conflicts
      const { data: driverCalendar } = await supabase
        .from("driver_calendar" as any)
        .select("driver_id")
        .gte("window_end", pickupAt)
        .lte("window_start", returnAt)
        .eq("entry_type", "trip");

      const busyDriverIds = driverCalendar?.map((c: any) => c.driver_id) || [];
      return (data || []).filter((d: any) => !busyDriverIds.includes(d.id));
    },
    enabled: assignDialogOpen,
  });

  // Create assignment
  const createAssignment = useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.user?.id)
        .single();

      // Create assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("trip_assignments" as any)
        .insert({
          organization_id: profile?.organization_id,
          trip_request_id: requestId,
          vehicle_id: vehicleId,
          driver_id: driverId,
          assigned_by: user.user?.id,
          status: "scheduled",
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Create calendar entries
      await supabase.from("vehicle_calendar" as any).insert({
        organization_id: profile?.organization_id,
        vehicle_id: vehicleId,
        window_start: pickupAt,
        window_end: returnAt,
        entry_type: "trip",
        reference_id: (assignment as any).id,
        reference_type: "trip_assignment",
      });

      if (driverId) {
        await supabase.from("driver_calendar" as any).insert({
          organization_id: profile?.organization_id,
          driver_id: driverId,
          window_start: pickupAt,
          window_end: returnAt,
          entry_type: "trip",
          reference_id: (assignment as any).id,
          reference_type: "trip_assignment",
        });
      }

      // Update request status
      await supabase
        .from("trip_requests" as any)
        .update({ status: "scheduled" })
        .eq("id", requestId);

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-recommendations"] });
      toast({
        title: "Assigned",
        description: "Vehicle and driver assigned successfully",
      });
      setAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openAssignDialog = (vehicleScore: VehicleScore) => {
    setSelectedVehicle(vehicleScore);
    setSelectedDriverId(vehicleScore.driver?.id || "");
    setAssignDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Analyzing available vehicles...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No vehicles available for this time slot
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recommended Vehicles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={rec.vehicle.id}
              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {index === 0 && rec.score >= 80 && (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    )}
                    {index === 0 && rec.score < 80 && (
                      <Truck className="w-5 h-5 text-primary" />
                    )}
                    {index > 0 && <Truck className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {rec.vehicle.plate_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rec.vehicle.make} {rec.vehicle.model}
                      {rec.vehicle.vehicle_class && (
                        <Badge variant="outline" className="ml-2">
                          {rec.vehicle.vehicle_class}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {rec.score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  {index === 0 && rec.score >= 80 && (
                    <Badge className="bg-green-500">Best Match</Badge>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                {Object.entries(rec.breakdown).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground capitalize">
                      {key}
                    </div>
                    <Progress value={value} className="h-2" />
                    <div className="text-xs text-muted-foreground">{value}%</div>
                  </div>
                ))}
              </div>

              {/* Conflicts & Warnings */}
              {rec.conflicts.length > 0 && (
                <div className="flex items-start gap-2 mb-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{rec.conflicts.join(", ")}</div>
                </div>
              )}
              {rec.warnings.length > 0 && (
                <div className="flex items-start gap-2 mb-2 text-sm text-yellow-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{rec.warnings.join(", ")}</div>
                </div>
              )}

              {/* Assign Button */}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => openAssignDialog(rec)}
                  disabled={rec.conflicts.length > 0}
                >
                  Assign Vehicle
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle & Driver</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Vehicle</Label>
              <div className="text-lg font-semibold">
                {selectedVehicle?.vehicle.plate_number} - {selectedVehicle?.vehicle.make} {selectedVehicle?.vehicle.model}
              </div>
            </div>

            <div>
              <Label htmlFor="driver">Assign Driver *</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers?.map((driver: any) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createAssignment.mutate({
                vehicleId: selectedVehicle?.vehicle.id,
                driverId: selectedDriverId,
              })}
              disabled={!selectedDriverId || createAssignment.isPending}
            >
              {createAssignment.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
