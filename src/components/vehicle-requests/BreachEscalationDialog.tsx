/**
 * Breach Escalation Dialog
 * ------------------------
 * Logs an OLA non-compliance incident to ola_breach_escalations so the
 * issue can be discussed with stakeholders and (if unresolved) escalated
 * to CxQMD per OLA section 3.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  requestNumber?: string;
}

export function BreachEscalationDialog({ open, onOpenChange, requestId, requestNumber }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [reason, setReason] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [escalateCxQMD, setEscalateCxQMD] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast({ title: "Reason too short", description: "Please describe the OLA non-compliance (≥10 chars).", variant: "destructive" });
      return;
    }
    if (!user || !organizationId) return;
    setSubmitting(true);
    const { error } = await supabase.from("ola_breach_escalations").insert({
      request_id: requestId,
      organization_id: organizationId,
      raised_by: user.id,
      reason: reason.trim(),
      root_cause: rootCause.trim() || null,
      status: escalateCxQMD ? "escalated_cxqmd" : "open",
      escalated_to_cxqmd_at: escalateCxQMD ? new Date().toISOString() : null,
    });
    if (error) {
      toast({ title: "Could not log escalation", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Escalation logged", description: escalateCxQMD ? "Escalated to CxQMD." : "Discuss with stakeholders before escalating." });
      onOpenChange(false);
      setReason(""); setRootCause(""); setEscalateCxQMD(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log OLA breach{requestNumber ? ` — ${requestNumber}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>What went wrong?</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. No vehicle assigned within 30 minutes; requester escalated by phone." />
          </div>
          <div>
            <Label>Root cause (optional)</Label>
            <Textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="e.g. All pool vehicles in field; no spare available." />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="esc" checked={escalateCxQMD} onCheckedChange={(v) => setEscalateCxQMD(!!v)} />
            <Label htmlFor="esc" className="font-normal text-sm">Escalate immediately to CxQMD (Customer Experience &amp; Quality Mgmt)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} variant={escalateCxQMD ? "destructive" : "default"}>
            {submitting ? "Submitting…" : escalateCxQMD ? "Log + Escalate to CxQMD" : "Log breach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
