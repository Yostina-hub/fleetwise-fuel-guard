import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Car } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import PhotoUploader from "./PhotoUploader";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleMakeModel?: string;
}

const DriverMaintenanceDialog = ({ open, onOpenChange, driverId, vehicleId, vehiclePlate, vehicleMakeModel }: Props) => {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    request_type: "corrective",
    priority: "medium",
    km_reading: "",
    description: "",
    notes: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);

  // Fallback: if no vehicleId passed but we have driverId + open, look up the assigned vehicle directly.
  // This guarantees the dialog never shows "No vehicle assigned" when one actually exists.
  const { data: fallbackVehicle, isLoading: loadingFallback } = useQuery({
    queryKey: ["driver-maintenance-assigned-vehicle", driverId, organizationId],
    enabled: open && !vehicleId && !!driverId && !!organizationId,
    queryFn: async () => {
      // 1) Active vehicle request assignment
      const { data: req } = await (supabase as any)
        .from("vehicle_requests")
        .select(`assigned_vehicle_id, assigned_vehicle:assigned_vehicle_id(id, plate_number, make, model)`)
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driverId)
        .in("status", ["assigned", "approved", "in_progress"])
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (req?.assigned_vehicle) return req.assigned_vehicle;

      // 2) Permanent assignment
      const { data: v } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driverId)
        .maybeSingle();
      return v || null;
    },
  });

  const effectiveVehicleId = vehicleId || fallbackVehicle?.id;
  const effectivePlate = vehiclePlate || fallbackVehicle?.plate_number;
  const effectiveMakeModel = vehicleMakeModel || (fallbackVehicle ? `${fallbackVehicle.make} ${fallbackVehicle.model}` : undefined);

  useEffect(() => {
    if (!open) {
      setForm({ request_type: "corrective", priority: "medium", km_reading: "", description: "", notes: "" });
      setPhotos([]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!effectiveVehicleId || !driverId || !organizationId) return;
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      const reqNumber = "MR-" + Date.now().toString().slice(-8);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("maintenance_requests").insert({
        organization_id: organizationId,
        request_number: reqNumber,
        requested_by: userData.user?.id,
        vehicle_id: effectiveVehicleId,
        driver_id: driverId,
        request_type: form.request_type,
        trigger_source: "manual",
        priority: form.priority,
        km_reading: form.km_reading ? Number(form.km_reading) : null,
        description: form.description,
        notes: form.notes || null,
        status: "submitted",
        workflow_stage: "submitted",
        photo_urls: photos,
      } as any);
      if (error) throw error;
      toast.success("Maintenance request submitted");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const showEmpty = !effectiveVehicleId && !loadingFallback;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Report Vehicle Issue
          </DialogTitle>
          <DialogDescription>
            {effectivePlate ? `Reporting for ${effectivePlate}${effectiveMakeModel ? ` (${effectiveMakeModel})` : ""}` : (loadingFallback ? "Loading assigned vehicle..." : "No vehicle assigned")}
          </DialogDescription>
        </DialogHeader>

        {loadingFallback && !effectiveVehicleId ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : effectiveVehicleId ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Type *</Label>
                <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Something is broken</SelectItem>
                    <SelectItem value="preventive">Scheduled service</SelectItem>
                    <SelectItem value="breakdown">Vehicle won't start/move</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>How urgent?</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Can wait</SelectItem>
                    <SelectItem value="medium">Soon</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                    <SelectItem value="critical">Vehicle unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Current Odometer (km)</Label>
              <Input type="number" value={form.km_reading}
                onChange={e => setForm(f => ({ ...f, km_reading: e.target.value }))} placeholder="Enter current km" />
            </div>

            <div>
              <Label>What's the problem? *</Label>
              <Textarea value={form.description} rows={4}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what's wrong with the vehicle..." />
            </div>

            <div>
              <Label>Additional notes</Label>
              <Textarea value={form.notes} rows={2}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. noise from the engine, warning light on dashboard..." />
            </div>

            <div>
              <Label>Photos of the issue (optional)</Label>
              <PhotoUploader
                pathPrefix={`maintenance/${effectiveVehicleId}`}
                value={photos}
                onChange={setPhotos}
                max={5}
                label="Take / attach photos"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.description.trim()}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
                Submit Request
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No vehicle assigned to you.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DriverMaintenanceDialog;
