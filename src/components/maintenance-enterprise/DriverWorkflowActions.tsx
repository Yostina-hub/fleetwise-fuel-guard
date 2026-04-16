import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Inbox, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { MaintenanceRequest } from "@/hooks/useMaintenanceRequests";

interface Props {
  request: MaintenanceRequest;
}

const DriverWorkflowActions = ({ request }: Props) => {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const stage = request.workflow_stage || request.status;
  const canDeliver = stage === "vehicle_delivery";
  const canReceive = stage === "delivery_check" || stage === "post_inspection" || stage === "payment_pending";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["maintenance-requests"] });
    qc.invalidateQueries({ queryKey: ["maintenance-workflow-events", request.id] });
  };

  const handleDeliver = async () => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("driver_confirm_vehicle_delivered", {
        p_request_id: request.id,
        p_notes: notes || null,
      });
      if (error) throw error;
      const verified = data?.verified;
      if (verified) {
        toast.success("Delivery confirmed — geofence verified ✓");
      } else {
        toast.warning("Delivery recorded, but vehicle is not within supplier geofence yet.");
      }
      setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm delivery");
    } finally {
      setBusy(false);
    }
  };

  const handleReceive = async () => {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("driver_confirm_vehicle_received", {
        p_request_id: request.id,
        p_notes: notes || null,
      });
      if (error) throw error;
      toast.success("Vehicle receipt confirmed ✓");
      setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm receipt");
    } finally {
      setBusy(false);
    }
  };

  if (!canDeliver && !canReceive) {
    if (request.vehicle_delivered_at && !request.vehicle_received_at) {
      return (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Vehicle delivered to supplier · waiting for maintenance.
          </CardContent>
        </Card>
      );
    }
    if (request.vehicle_received_at) {
      return (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Vehicle received back · workflow complete.
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {canDeliver ? <Truck className="w-5 h-5 text-warning" /> : <Inbox className="w-5 h-5 text-success" />}
          <h4 className="font-semibold text-sm">
            {canDeliver ? "Action required: Deliver vehicle to supplier" : "Action required: Confirm vehicle received"}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Your current GPS location will be checked against the supplier's geofence automatically.
        </p>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={canDeliver ? "e.g. handed over to supplier reception" : "e.g. vehicle running well, all parts replaced"}
          />
        </div>
        <Button
          onClick={canDeliver ? handleDeliver : handleReceive}
          disabled={busy}
          className="w-full"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {canDeliver ? "Confirm Delivery (with geofence check)" : "Confirm Vehicle Received"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DriverWorkflowActions;
