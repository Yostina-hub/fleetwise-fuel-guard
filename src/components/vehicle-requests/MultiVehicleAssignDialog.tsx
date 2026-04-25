import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableVehicles } from "@/hooks/useAvailableVehicles";
import { useLockedVehicles } from "@/hooks/useLockedVehicles";
import { usePoolMembership } from "@/hooks/usePoolMembership";
import { sendDispatchSms } from "@/services/smsNotificationService";
import { toast } from "sonner";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
}

/**
 * Multi-vehicle assignment for outsource requests with num_vehicles > 1.
 * Drivers are optional (outsource may bring their own).
 *
 * Pool scoping: vehicles & drivers are limited to the REQUEST'S pool
 * (`request.pool_name`). Org-wide roles (admin / fleet_owner / ops_manager)
 * still see everything.
 */
export const MultiVehicleAssignDialog = ({ request, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const { available } = useAvailableVehicles();
  const { lockedById } = useLockedVehicles();
  const { unrestricted: poolUnrestricted } = usePoolMembership();
  const requestPool: string | null = request.pool_name || null;

  // Restrict vehicle picker to the request's pool unless the user is org-wide.
  const scopedAvailable = poolUnrestricted || !requestPool
    ? available
    : available.filter((v) => v.specific_pool === requestPool);

  const [picks, setPicks] = useState<Record<string, string | null>>({}); // vehicleId -> driverId|null

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-for-multi-assign", request.organization_id, requestPool, poolUnrestricted],
    queryFn: async () => {
      let q = supabase
        .from("drivers")
        .select("id, first_name, last_name, phone, assigned_pool")
        .eq("organization_id", request.organization_id)
        .eq("status", "active");
      if (!poolUnrestricted && requestPool) {
        q = q.eq("assigned_pool", requestPool);
      }
      const { data, error } = await q.order("first_name").limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const target = request.num_vehicles || 1;
  const selectedCount = Object.keys(picks).length;

  const toggleVehicle = (vehicleId: string) => {
    setPicks(prev => {
      const next = { ...prev };
      if (vehicleId in next) delete next[vehicleId];
      else next[vehicleId] = null;
      return next;
    });
  };

  const setDriver = (vehicleId: string, driverId: string) => {
    setPicks(prev => ({ ...prev, [vehicleId]: driverId === "__none__" ? null : driverId }));
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (selectedCount === 0) throw new Error("Pick at least one vehicle");
      const user = (await supabase.auth.getUser()).data.user;

      const rows = Object.entries(picks).map(([vehicle_id, driver_id]) => ({
        vehicle_request_id: request.id,
        organization_id: request.organization_id,
        vehicle_id,
        driver_id,
        assigned_by: user?.id,
        status: "assigned",
      }));

      const { error } = await (supabase as any)
        .from("vehicle_request_assignments")
        .insert(rows);
      if (error) throw error;

      // Mark vehicles in_use & drivers on_trip
      await Promise.all(Object.entries(picks).map(async ([vid, did]) => {
        await (supabase as any).from("vehicles")
          .update({ status: "in_use", updated_at: new Date().toISOString() }).eq("id", vid);
        if (did) {
          await (supabase as any).from("drivers")
            .update({ status: "on_trip", updated_at: new Date().toISOString() }).eq("id", did);
        }
      }));

      // Update parent request: mark first as primary + flip to assigned
      const firstVid = Object.keys(picks)[0];
      const firstDid = picks[firstVid];
      await (supabase as any).from("vehicle_requests").update({
        status: "assigned",
        assigned_vehicle_id: firstVid,
        assigned_driver_id: firstDid,
        assigned_at: new Date().toISOString(),
        assigned_by: user?.id,
      }).eq("id", request.id);

      // Send dispatch SMS to every assigned driver (best-effort, errors logged)
      const driverById = new Map(drivers.map((d: any) => [d.id, d]));
      const vehicleById = new Map(available.map((v: any) => [v.id, v]));
      await Promise.allSettled(
        Object.entries(picks)
          .filter(([, did]) => !!did)
          .map(async ([vid, did]) => {
            const drv = driverById.get(did!);
            const veh = vehicleById.get(vid);
            if (!drv?.phone) return;
            return sendDispatchSms({
              driverPhone: drv.phone,
              driverName: `${drv.first_name || ""} ${drv.last_name || ""}`.trim(),
              jobNumber: request.request_number,
              pickupLocation: request.departure_place || "",
              dropoffLocation: request.destination || "",
              scheduledTime: request.needed_from,
              specialInstructions: veh?.plate_number ? `Vehicle: ${veh.plate_number}` : undefined,
            });
          })
      );
    },
    onSuccess: () => {
      toast.success(`${selectedCount} vehicle${selectedCount > 1 ? "s" : ""} assigned`);
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Multi-Vehicle Assignment — {request.request_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm bg-muted/50 rounded p-3">
            <span className="text-muted-foreground">Requested:</span>
            <Badge variant="outline">{target} vehicle{target > 1 ? "s" : ""}</Badge>
            <span className="text-muted-foreground ml-2">Selected:</span>
            <Badge variant={selectedCount === target ? "default" : "secondary"}>
              {selectedCount} / {target}
            </Badge>
            {request.pool_category === "outsource" && (
              <Badge className="ml-auto bg-amber-500/20 text-amber-600">Outsource — driver optional</Badge>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-2 w-10"></th>
                  <th className="text-left p-2">Vehicle</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Driver (optional for outsource)</th>
                </tr>
              </thead>
              <tbody>
                {available.slice(0, 50).map((v: any) => {
                  const checked = v.id in picks;
                  const lock = lockedById[v.id];
                  const isLocked = !!lock;
                  return (
                    <tr key={v.id} className={`border-t hover:bg-muted/30 ${isLocked ? "opacity-50" : ""}`}>
                      <td className="p-2">
                        <Checkbox
                          checked={checked}
                          disabled={isLocked}
                          onCheckedChange={() => !isLocked && toggleVehicle(v.id)}
                        />
                      </td>
                      <td className="p-2 font-medium flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        {v.plate_number}
                        {isLocked && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            Allocated to {lock.request_number}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">{v.make} {v.model}</td>
                      <td className="p-2">
                        {checked && !isLocked && (
                          <Select value={picks[v.id] || "__none__"} onValueChange={(val) => setDriver(v.id, val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick driver..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs italic">— No driver (outsource)</SelectItem>
                              {drivers.map((d: any) => (
                                <SelectItem key={d.id} value={d.id} className="text-xs">{d.first_name} {d.last_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={selectedCount === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Assigning..." : `Assign ${selectedCount} vehicle${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
