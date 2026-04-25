import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, Users, IdCard, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSuggestedVehicles } from "@/hooks/useSuggestedVehicles";
import { useSuggestedDrivers } from "@/hooks/useSuggestedDrivers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAssignmentDialog = ({ open, onOpenChange }: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [tripRequestId, setTripRequestId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  // Approved trip requests w/o assignment yet
  const { data: tripRequests = [] } = useQuery({
    queryKey: ["unassigned-trip-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_requests")
        .select(`
          id, request_number, purpose, pickup_at, return_at, status, passenger_count,
          pickup_geofence:pickup_geofence_id(name, center_lat, center_lng),
          drop_geofence:drop_geofence_id(name)
        `)
        .eq("organization_id", organizationId!)
        .in("status", ["approved", "scheduled"])
        .order("pickup_at", { ascending: true });
      if (error) throw error;
      const { data: existing } = await supabase
        .from("trip_assignments")
        .select("trip_request_id")
        .eq("organization_id", organizationId!);
      const taken = new Set((existing || []).map((a: any) => a.trip_request_id));
      return (data || []).filter((r: any) => !taken.has(r.id));
    },
    enabled: !!organizationId && open,
  });

  const selectedTrip = useMemo(
    () => tripRequests.find((r: any) => r.id === tripRequestId),
    [tripRequests, tripRequestId],
  );
  const passengers = selectedTrip?.passenger_count ?? null;
  const pickupLat = (selectedTrip as any)?.pickup_geofence?.center_lat ?? null;
  const pickupLng = (selectedTrip as any)?.pickup_geofence?.center_lng ?? null;

  // Smart vehicle suggestions — capacity-filtered when a trip is selected.
  const { data: vehicleSuggestions = [], isLoading: vehLoading } = useSuggestedVehicles({
    organizationId,
    pickupLat,
    pickupLng,
    passengers,
    strictCapacity: !!passengers,
    enabled: open && !!tripRequestId,
  });

  const selectedVehicle = useMemo(
    () => vehicleSuggestions.find((v) => v.id === vehicleId) || null,
    [vehicleSuggestions, vehicleId],
  );

  // Smart driver suggestions — license-evaluated against the chosen vehicle.
  const { data: driverSuggestions = [], isLoading: drvLoading } = useSuggestedDrivers({
    organizationId,
    vehicle: selectedVehicle
      ? {
          vehicle_category: selectedVehicle.vehicle_category,
          vehicle_type: selectedVehicle.vehicle_type,
          seating_capacity: selectedVehicle.seating_capacity,
        }
      : null,
    enabled: open && !!tripRequestId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tripRequestId || !vehicleId || !driverId || !organizationId) {
        throw new Error("Please fill all required fields");
      }
      const { error } = await supabase.from("trip_assignments").insert({
        organization_id: organizationId,
        trip_request_id: tripRequestId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        status: "scheduled",
        notes: notes || null,
      });
      if (error) throw error;
      await supabase.from("trip_requests").update({ status: "scheduled" }).eq("id", tripRequestId);
    },
    onSuccess: () => {
      toast.success("Assignment created successfully");
      queryClient.invalidateQueries({ queryKey: ["active-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-trip-requests"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reset = () => {
    setTripRequestId("");
    setVehicleId("");
    setDriverId("");
    setNotes("");
  };

  // Reset downstream picks when trip changes
  const handleTripChange = (id: string) => {
    setTripRequestId(id);
    setVehicleId("");
    setDriverId("");
  };
  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    setDriverId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Create Trip Assignment
          </DialogTitle>
        </DialogHeader>

        <TooltipProvider>
          <div className="space-y-4">
            {/* Trip request */}
            <div>
              <Label>Trip Request *</Label>
              <Select value={tripRequestId} onValueChange={handleTripChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select approved trip request..." />
                </SelectTrigger>
                <SelectContent>
                  {tripRequests.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No approved trip requests available
                    </div>
                  ) : (
                    tripRequests.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.request_number} — {r.purpose?.substring(0, 40) || "No purpose"} (
                        {format(new Date(r.pickup_at), "MMM dd")} · {r.passenger_count} pax)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTrip && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{passengers} passenger(s)</span>
                  {(selectedTrip as any).pickup_geofence?.name && (
                    <span>· Pickup: {(selectedTrip as any).pickup_geofence.name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Vehicle */}
            <div>
              <Label className="flex items-center gap-2">
                Vehicle *
                {passengers && (
                  <Badge variant="outline" className="text-[10px]">
                    Capacity ≥ {passengers}
                  </Badge>
                )}
              </Label>
              <Select
                value={vehicleId}
                onValueChange={handleVehicleChange}
                disabled={!tripRequestId || vehLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !tripRequestId
                        ? "Select a trip request first"
                        : vehLoading
                          ? "Loading suggestions…"
                          : "Select vehicle..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vehicleSuggestions.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No vehicles match capacity / availability
                    </div>
                  ) : (
                    vehicleSuggestions.map((v) => (
                      <SelectItem key={v.id} value={v.id} disabled={v.availability !== "available"}>
                        <div className="flex items-center gap-2">
                          <span>
                            {v.plate_number} — {v.make} {v.model}
                          </span>
                          {v.seating_capacity != null && (
                            <Badge variant="secondary" className="text-[10px]">
                              {v.seating_capacity} seats
                            </Badge>
                          )}
                          {v.is_top_pick && (
                            <Badge className="text-[10px]">Top pick</Badge>
                          )}
                          {v.availability !== "available" && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {v.availability}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedVehicle && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                  {selectedVehicle.vehicle_category && (
                    <Badge variant="outline">{selectedVehicle.vehicle_category}</Badge>
                  )}
                  {selectedVehicle.distance_km != null && (
                    <Badge variant="outline">{selectedVehicle.distance_km} km away</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Driver */}
            <div>
              <Label className="flex items-center gap-2">
                Driver *
                {selectedVehicle && (
                  <Badge variant="outline" className="text-[10px]">
                    <IdCard className="h-3 w-3 mr-1" /> License-checked
                  </Badge>
                )}
              </Label>
              <Select
                value={driverId}
                onValueChange={setDriverId}
                disabled={!vehicleId || drvLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !vehicleId
                        ? "Select a vehicle first"
                        : drvLoading
                          ? "Loading suggestions…"
                          : "Select driver..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {driverSuggestions.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No drivers available
                    </div>
                  ) : (
                    driverSuggestions.map((d) => {
                      const lic = d.license;
                      const licOk = lic?.matches && !lic.expired;
                      const disabled = d.availability !== "available" || (lic && !licOk);
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={!!disabled}>
                          <div className="flex items-center gap-2">
                            <span>
                              {d.first_name} {d.last_name}
                            </span>
                            {lic && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    {licOk ? (
                                      <Badge variant="secondary" className="text-[10px]">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        {lic.summary}
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-[10px]">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {lic.summary}
                                      </Badge>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Required: Class {lic.required} ·
                                  Held: {lic.held.join(", ") || "none"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {d.is_top_pick && (
                              <Badge className="text-[10px]">Top pick</Badge>
                            )}
                            {d.availability !== "available" && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {d.availability.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!tripRequestId || !vehicleId || !driverId || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
