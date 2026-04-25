/**
 * Extend Duration Dialog
 * ----------------------
 * Lets a requester ask to extend the assigned vehicle's `needed_until`.
 * Creates a row in `vehicle_request_extensions` for manager approval.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  currentEnd?: string | null;
}

export function ExtendDurationDialog({ open, onOpenChange, requestId, currentEnd }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [until, setUntil] = useState(() =>
    currentEnd ? format(new Date(currentEnd), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!until || reason.trim().length < 5) {
      toast({ title: "Missing fields", description: "Pick a new end time and provide a reason (≥5 chars).", variant: "destructive" });
      return;
    }
    if (!user || !organizationId) return;
    setSubmitting(true);
    const { error } = await supabase.from("vehicle_request_extensions").insert({
      request_id: requestId,
      organization_id: organizationId,
      requested_by: user.id,
      requested_until: new Date(until).toISOString(),
      reason: reason.trim(),
    });
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
    } else {
      // Mark request as having a pending extension
      await supabase.from("vehicle_requests").update({ extension_status: "pending" }).eq("id", requestId);
      toast({ title: "Extension requested", description: "A manager will review your request shortly." });
      onOpenChange(false);
      setReason("");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend assignment duration</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New end time</Label>
            <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need more time?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Request extension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
