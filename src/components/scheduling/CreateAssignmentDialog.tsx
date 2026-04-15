import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAssignmentDialog = ({ open, onOpenChange }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();

  const [tripRequestId, setTripRequestId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch approved trip requests that don't have assignments yet
  const { data: tripRequests = [] } = useQuery({
    queryKey: ["unassigned-trip-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_requests")
        .select(`
          id, request_number, purpose, pickup_at, return_at, status,
          pickup_geofence:pickup_geofence_id(name),
          drop_geofence:drop_geofence_id(name)
        `)
        .eq("organization_id", organizationId!)
        .in("status", ["approved", "scheduled"])
        .order("pickup_at", { ascending: true });
      if (error) throw error;

      // Filter out ones that already have assignments
      const { data: existingAssignments } = await supabase
        .from("trip_assignments")
        .select("trip_request_id")
        .eq("organization_id", organizationId!);

      const assignedIds = new Set((existingAssignments || []).map((a: any) => a.trip_request_id));
      return (data || []).filter((r: any) => !assignedIds.has(r.id));
    },
    enabled: !!organizationId && open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tripRequestId || !vehicleId || !driverId || !organizationId) {
        throw new Error("Please fill all required fields");
      }
      const { error } = await supabase
        .from("trip_assignments")
        .insert({
          organization_id: organizationId,
          trip_request_id: tripRequestId,
          vehicle_id: vehicleId,
          driver_id: driverId,
          status: "scheduled",
          notes: notes || null,
        });
      if (error) throw error;

      // Update trip request status to scheduled
      await supabase
        .from("trip_requests")
        .update({ status: "scheduled" })
        .eq("id", tripRequestId);
    },
    onSuccess: () => {
      toast.success("Assignment created successfully");
      queryClient.invalidateQueries({ queryKey: ["active-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["trip-requests"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-trip-requests"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setTripRequestId("");
    setVehicleId("");
    setDriverId("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Trip Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Trip Request *</Label>
            <Select value={tripRequestId} onValueChange={setTripRequestId}>
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
                      {r.request_number} — {r.purpose?.substring(0, 40) || "No purpose"} ({format(new Date(r.pickup_at), "MMM dd")})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.filter((v: any) => v.status === "active").map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate_number} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Driver *</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.filter((d: any) => d.status === "active").map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
