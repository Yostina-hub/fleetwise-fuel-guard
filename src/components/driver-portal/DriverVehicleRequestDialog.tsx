import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverName?: string;
}

const DriverVehicleRequestDialog = ({ open, onOpenChange, driverName }: Props) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purpose: "",
    request_type: "trip",
    priority: "medium",
    needed_from: "",
    needed_until: "",
    passengers: "1",
    departure_place: "",
    destination: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!organizationId) { toast.error("No organization context"); return; }
    if (!form.purpose.trim()) { toast.error("Please describe the purpose"); return; }
    if (!form.needed_from) { toast.error("Pick a needed-from date/time"); return; }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const reqNumber = `VR-${Date.now()}`;
      const { data: inserted, error } = await (supabase as any).from("vehicle_requests").insert({
        organization_id: organizationId,
        request_number: reqNumber,
        requester_id: userData.user?.id,
        requester_name: driverName || userData.user?.email || "Driver",
        purpose: form.purpose,
        request_type: form.request_type,
        priority: form.priority,
        needed_from: new Date(form.needed_from).toISOString(),
        needed_until: form.needed_until ? new Date(form.needed_until).toISOString() : null,
        passengers: form.passengers ? Number(form.passengers) : 1,
        departure_place: form.departure_place || null,
        destination: form.destination || null,
        dispatcher_notes: form.notes || null,
        status: "submitted",
        approval_status: "pending_approval",
      }).select("id").single();
      if (error) throw error;

      // Trigger approval routing
      try {
        await (supabase as any).rpc("route_vehicle_request_approval", { p_request_id: inserted.id });
      } catch { /* non-fatal: routing can be retried by ops */ }

      toast.success("Vehicle request submitted");
      queryClient.invalidateQueries({ queryKey: ["driver-portal-submissions"] });
      onOpenChange(false);
      setForm({ purpose: "", request_type: "trip", priority: "medium", needed_from: "", needed_until: "", passengers: "1", departure_place: "", destination: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-accent" /> Request a Vehicle
          </DialogTitle>
          <DialogDescription>Submit a request for a vehicle assignment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Purpose *</Label>
            <Input value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Site inspection visit" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trip Type</Label>
              <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trip">Single Trip</SelectItem>
                  <SelectItem value="daily">Daily Use</SelectItem>
                  <SelectItem value="long_term">Long Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Needed From *</Label>
              <Input type="datetime-local" value={form.needed_from}
                onChange={e => setForm(f => ({ ...f, needed_from: e.target.value }))} />
            </div>
            <div>
              <Label>Needed Until</Label>
              <Input type="datetime-local" value={form.needed_until}
                onChange={e => setForm(f => ({ ...f, needed_until: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Passengers</Label>
              <Input type="number" min="1" value={form.passengers}
                onChange={e => setForm(f => ({ ...f, passengers: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Departure</Label>
              <Input value={form.departure_place}
                onChange={e => setForm(f => ({ ...f, departure_place: e.target.value }))}
                placeholder="Pickup location" />
            </div>
          </div>

          <div>
            <Label>Destination</Label>
            <Input value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              placeholder="Where to" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional context for the dispatcher" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.purpose.trim() || !form.needed_from}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
              Submit Request
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverVehicleRequestDialog;
