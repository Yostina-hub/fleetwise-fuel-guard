import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fuel, Loader2, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleFuelType?: string | null;
}

const DriverFuelRequestDialog = ({
  open, onOpenChange, driverId, driverName, vehicleId, vehiclePlate, vehicleFuelType
}: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fuel_type: vehicleFuelType || "diesel",
    liters_requested: "",
    current_odometer: "",
    purpose: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!organizationId || !vehicleId || !driverId) {
      toast.error("Missing driver or vehicle info");
      return;
    }
    const liters = Number(form.liters_requested);
    if (!liters || liters <= 0) {
      toast.error("Enter a valid amount of fuel needed");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const reqNumber = `FR-${Date.now()}`;
      const { error } = await (supabase as any).from("fuel_requests").insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        requested_by: userData.user?.id,
        request_number: reqNumber,
        request_type: "vehicle",
        fuel_type: form.fuel_type,
        liters_requested: liters,
        current_odometer: form.current_odometer ? Number(form.current_odometer) : null,
        purpose: form.purpose || null,
        notes: form.notes || null,
        driver_name: driverName,
        trigger_source: "manual",
        status: "pending",
        clearance_status: "pending",
      });
      if (error) throw error;
      toast.success("Fuel request submitted");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      onOpenChange(false);
      setForm({ fuel_type: vehicleFuelType || "diesel", liters_requested: "", current_odometer: "", purpose: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit fuel request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" /> Request Fuel
          </DialogTitle>
          <DialogDescription>
            {vehiclePlate
              ? `Submitting fuel request for ${vehiclePlate}`
              : "No vehicle assigned — contact Fleet Operations"}
          </DialogDescription>
        </DialogHeader>

        {vehicleId ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fuel Type *</Label>
                <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol/Benzine</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric (charging)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Liters Needed *</Label>
                <Input type="number" min="1" step="0.5" value={form.liters_requested}
                  onChange={e => setForm(f => ({ ...f, liters_requested: e.target.value }))} placeholder="e.g. 50" />
              </div>
            </div>

            <div>
              <Label>Current Odometer (km)</Label>
              <Input type="number" value={form.current_odometer}
                onChange={e => setForm(f => ({ ...f, current_odometer: e.target.value }))} placeholder="e.g. 124,500" />
            </div>

            <div>
              <Label>Purpose</Label>
              <Input value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="e.g. Refill before long trip" />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} rows={2}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional context for fleet operations" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.liters_requested}>
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

export default DriverFuelRequestDialog;
