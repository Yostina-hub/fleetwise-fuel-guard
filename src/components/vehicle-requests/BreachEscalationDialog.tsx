/**
 * Breach Escalation Dialog
 * ------------------------
 * Logs an OLA non-compliance incident to ola_breach_escalations so the
 * issue can be discussed with stakeholders and (if unresolved) escalated
 * to CxQMD per OLA section 3.
 */
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  requestNumber?: string;
}

const breachSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please describe the OLA non-compliance (at least 10 characters)")
    .max(1000, "Reason must be under 1000 characters"),
  root_cause: z
    .string()
    .max(1000, "Root cause must be under 1000 characters")
    .optional()
    .or(z.literal("")),
  escalate: z.boolean(),
});

type BreachFormData = z.infer<typeof breachSchema>;

const initialForm: BreachFormData = {
  reason: "",
  root_cause: "",
  escalate: false,
};

export function BreachEscalationDialog({
  open,
  onOpenChange,
  requestId,
  requestNumber,
}: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [form, setForm] = useState<BreachFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const v = useFieldValidation(breachSchema);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      v.reset();
    }
  }, [open]);

  const update = <K extends keyof BreachFormData>(field: K, value: BreachFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    v.handleChange(field as never, value);
  };

  const errCls = (field: keyof BreachFormData) =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const submit = async () => {
    if (!user || !organizationId) {
      toast.error("Missing user or organization context");
      return;
    }
    const result = v.validateAll(form as unknown as Record<string, unknown>);
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before submitting`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("ola_breach_escalations").insert({
      request_id: requestId,
      organization_id: organizationId,
      raised_by: user.id,
      reason: form.reason.trim(),
      root_cause: form.root_cause?.trim() || null,
      status: form.escalate ? "escalated_cxqmd" : "open",
      escalated_to_cxqmd_at: form.escalate ? new Date().toISOString() : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not log escalation");
      return;
    }
    toast.success(
      form.escalate
        ? "Breach logged and escalated to CxQMD"
        : "Breach logged — discuss with stakeholders before escalating",
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Log OLA breach{requestNumber ? ` — ${requestNumber}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {v.hasVisibleErrors && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Please fix the highlighted fields</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {Object.entries(v.errors).map(([k, msg]) =>
                    msg ? <li key={k}>{msg}</li> : null,
                  )}
                </ul>
              </div>
            </div>
          )}

          <div>
            <Label>
              What went wrong? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={3}
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              onBlur={() => v.handleBlur("reason", form.reason)}
              placeholder="e.g. No vehicle assigned within 30 minutes; requester escalated by phone."
              maxLength={1000}
              className={cn(errCls("reason"))}
            />
            <div className="flex justify-between mt-1">
              {v.getError("reason") ? (
                <p className="text-xs text-destructive">{v.getError("reason")}</p>
              ) : (
                <span />
              )}
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {form.reason.length}/1000
              </p>
            </div>
          </div>

          <div>
            <Label>Root cause (optional)</Label>
            <Textarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => update("root_cause", e.target.value)}
              onBlur={() => v.handleBlur("root_cause", form.root_cause)}
              placeholder="e.g. All pool vehicles in field; no spare available."
              maxLength={1000}
              className={cn(errCls("root_cause"))}
            />
            <div className="flex justify-between mt-1">
              {v.getError("root_cause") ? (
                <p className="text-xs text-destructive">{v.getError("root_cause")}</p>
              ) : (
                <span />
              )}
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {(form.root_cause || "").length}/1000
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="esc"
              checked={form.escalate}
              onCheckedChange={(val) => update("escalate", !!val)}
            />
            <Label htmlFor="esc" className="font-normal text-sm">
              Escalate immediately to CxQMD (Customer Experience &amp; Quality Mgmt)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            variant={form.escalate ? "destructive" : "default"}
            className="gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting
              ? "Submitting…"
              : form.escalate
                ? "Log + Escalate to CxQMD"
                : "Log breach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
