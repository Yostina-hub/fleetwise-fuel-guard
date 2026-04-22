import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, ArrowRight, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

import { toast } from "sonner";

interface Props {
  request: any;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export const CrossPoolAssignmentDialog = ({ request, open, onClose, onBack }: Props) => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [reason, setReason] = useState("");
  const [targetPool, setTargetPool] = useState("");

  const { data: pools = [] } = useQuery({
    queryKey: ["fleet-pools", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_pools")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  // Vehicles in target pool with live status
  const { data: poolVehicles = [] } = useQuery({
    queryKey: ["cross-pool-vehicles", organizationId, targetPool],
    enabled: !!organizationId && open && !!targetPool,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicles")
        .select("id, plate_number, make, model, status, specific_pool")
        .eq("organization_id", organizationId!)
        .eq("specific_pool", targetPool)
        .order("plate_number");
      if (error) throw error;
      return data || [];
    },
  });

  // Drivers in target pool with live status
  const { data: poolDrivers = [] } = useQuery({
    queryKey: ["cross-pool-drivers", organizationId, targetPool],
    enabled: !!organizationId && open && !!targetPool,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, status, assigned_pool")
        .eq("organization_id", organizationId!)
        .eq("assigned_pool", targetPool)
        .order("first_name");
      if (error) throw error;
      return data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!targetPool) throw new Error("Select a target pool");
      if (!selectedVehicle) throw new Error("Select a vehicle");
      if (!selectedDriver) throw new Error("Select a driver — required so the request shows in the Driver Portal.");
      if (!reason.trim()) throw new Error("Please provide a reason for cross-pool assignment");

      const veh = poolVehicles.find((v: any) => v.id === selectedVehicle);
      if (!veh || veh.specific_pool !== targetPool) {
        throw new Error("Selected vehicle is not from the target pool");
      }
      const drv = poolDrivers.find((d: any) => d.id === selectedDriver);
      if (!drv || drv.assigned_pool !== targetPool) {
        throw new Error("Selected driver is not from the target pool");
      }

      const mins = Math.round((Date.now() - new Date(request.created_at).getTime()) / 60000);
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          status: "assigned",
          assigned_vehicle_id: selectedVehicle,
          assigned_driver_id: selectedDriver,
          assigned_at: new Date().toISOString(),
          actual_assignment_minutes: mins,
          cross_pool_assignment: true,
          original_pool_name: request.pool_name || null,
          pool_name: targetPool || request.pool_name,
          purpose: (request.purpose || "") + `\n[Cross-pool: ${reason}]`,
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cross-pool vehicle assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Reset selections when target pool changes
  const handlePoolChange = (val: string) => {
    setTargetPool(val);
    setSelectedVehicle("");
    setSelectedDriver("");
  };

  const vehicleStatusLabel = (s?: string) => {
    if (!s) return { label: "Unknown", cls: "bg-muted text-muted-foreground" };
    if (s === "active") return { label: "Available", cls: "bg-success/15 text-success border border-success/30" };
    if (s === "in_use" || s === "on_trip") return { label: "In use", cls: "bg-warning/15 text-warning border border-warning/30" };
    if (s === "maintenance") return { label: "Maintenance", cls: "bg-destructive/15 text-destructive border border-destructive/30" };
    return { label: s, cls: "bg-muted text-muted-foreground" };
  };
  const driverStatusLabel = (s?: string) => {
    if (!s) return { label: "Unknown", cls: "bg-muted text-muted-foreground" };
    if (s === "active") return { label: "Available", cls: "bg-success/15 text-success border border-success/30" };
    if (s === "on_trip" || s === "on_duty") return { label: "On trip", cls: "bg-warning/15 text-warning border border-warning/30" };
    if (s === "off_duty" || s === "inactive") return { label: "Off duty", cls: "bg-muted text-muted-foreground border" };
    if (s === "suspended") return { label: "Suspended", cls: "bg-destructive/15 text-destructive border border-destructive/30" };
    return { label: s, cls: "bg-muted text-muted-foreground" };
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-amber-500" />
            Cross-Pool Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-500/10 rounded-lg p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">Temporary Cross-Pool Assignment</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                This assigns a vehicle from a different pool. The vehicle will be temporarily reassigned and should be returned to its original pool after the trip.
              </p>
            </div>
          </div>

          {request.pool_name && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Original Pool:</span>
              <Badge variant="outline">{request.pool_category} / {request.pool_name}</Badge>
            </div>
          )}

          <div>
            <Label>Target Pool *</Label>
            <Select value={targetPool} onValueChange={handlePoolChange}>
              <SelectTrigger><SelectValue placeholder="Select target pool" /></SelectTrigger>
              <SelectContent>
                {pools.filter((p: any) => p.name !== request.pool_name).map((p: any) => (
                  <SelectItem key={p.id} value={p.name}>{p.category} / {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Vehicle (from target pool)</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={!targetPool}>
              <SelectTrigger>
                <SelectValue placeholder={targetPool ? "Select vehicle" : "Select target pool first"} />
              </SelectTrigger>
              <SelectContent>
                {poolVehicles.length === 0 && targetPool && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">No vehicles in this pool</div>
                )}
                {poolVehicles.map((v: any) => {
                  const st = vehicleStatusLabel(v.status);
                  const busy = v.status !== "active";
                  return (
                    <SelectItem key={v.id} value={v.id} disabled={busy}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{v.plate_number} — {v.make} {v.model}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {targetPool && poolVehicles.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {poolVehicles.filter((v: any) => v.status === "active").length} available · {poolVehicles.length} total in pool
              </p>
            )}
          </div>

          <div>
            <Label>Driver (from target pool) *</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={!targetPool}>
              <SelectTrigger>
                <SelectValue placeholder={targetPool ? "Select driver" : "Select target pool first"} />
              </SelectTrigger>
              <SelectContent>
                {poolDrivers.length === 0 && targetPool && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">No drivers in this pool</div>
                )}
                {poolDrivers.map((d: any) => {
                  const st = driverStatusLabel(d.status);
                  const busy = d.status !== "active";
                  return (
                    <SelectItem key={d.id} value={d.id} disabled={busy}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{d.first_name} {d.last_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {targetPool && poolDrivers.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {poolDrivers.filter((d: any) => d.status === "active").length} available · {poolDrivers.length} total in pool
              </p>
            )}
          </div>

          <div>
            <Label>Reason for Cross-Pool Assignment *</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why a vehicle from another pool is needed..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to details
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!selectedVehicle || !selectedDriver || !reason.trim() || assignMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Cross-Pool"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
