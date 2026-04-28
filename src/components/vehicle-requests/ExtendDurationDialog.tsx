/**
 * Extend Duration Dialog
 * ----------------------
 * Lets a requester ask to extend the assigned vehicle's `needed_until`.
 * Creates a row in `vehicle_request_extensions` for manager approval.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  currentEnd?: string | null;
}

// Build the schema with the current `currentEnd` baked in so the cross-field
// rule can ensure the new end is strictly after the existing one.
const buildSchema = (currentEnd?: string | null) =>
  z
    .object({
      until: z.string().min(1, "Pick a new end time"),
      reason: z
        .string()
        .trim()
        .min(5, "Reason must be at least 5 characters")
        .max(500, "Reason must be under 500 characters"),
    })
    .superRefine((data, ctx) => {
      const newEnd = new Date(data.until);
      if (Number.isNaN(newEnd.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["until"],
          message: "Invalid date/time",
        });
        return;
      }
      if (newEnd.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["until"],
          message: "New end time must be in the future",
        });
      }
      if (currentEnd) {
        const existingEnd = new Date(currentEnd);
        if (newEnd.getTime() <= existingEnd.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["until"],
            message: "New end time must be after the current end time",
          });
        }
      }
      // 30-day cap to stop accidental year-long extensions
      const maxAllowed = Date.now() + 30 * 24 * 60 * 60 * 1000;
      if (newEnd.getTime() > maxAllowed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["until"],
          message: "Extensions are capped at 30 days from now",
        });
      }
    });

export function ExtendDurationDialog({
  open,
  onOpenChange,
  requestId,
  currentEnd,
}: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();

  const [until, setUntil] = useState(() =>
    currentEnd ? format(new Date(currentEnd), "yyyy-MM-dd'T'HH:mm") : "",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const schema = buildSchema(currentEnd);
  const v = useFieldValidation(schema);

  useEffect(() => {
    if (!open) {
      setReason("");
      setUntil(currentEnd ? format(new Date(currentEnd), "yyyy-MM-dd'T'HH:mm") : "");
      v.reset();
    }
  }, [open, currentEnd]);

  const minDateTime = (() => {
    if (!currentEnd) return undefined;
    return format(new Date(currentEnd), "yyyy-MM-dd'T'HH:mm");
  })();

  const errCls = (field: "until" | "reason") =>
    v.getError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const submit = async () => {
    if (!user || !organizationId) {
      toast.error("Missing user or organization context");
      return;
    }
    const result = v.validateAll({ until, reason });
    if (!result.success) {
      const count = Object.keys(result.errors).length;
      toast.error(`Please fix ${count} field${count > 1 ? "s" : ""} before submitting`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("vehicle_request_extensions").insert({
      request_id: requestId,
      organization_id: organizationId,
      requested_by: user.id,
      requested_until: new Date(until).toISOString(),
      reason: reason.trim(),
    });
    if (error) {
      toast.error(error.message || "Could not submit extension request");
      setSubmitting(false);
      return;
    }
    // Mark request as having a pending extension
    await supabase
      .from("vehicle_requests")
      .update({ extension_status: "pending" })
      .eq("id", requestId);
    toast.success("Extension requested — a manager will review shortly");
    onOpenChange(false);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend assignment duration</DialogTitle>
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
              New end time <span className="text-destructive">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={until}
              min={minDateTime}
              onChange={(e) => {
                setUntil(e.target.value);
                v.handleChange("until", e.target.value);
              }}
              onBlur={() => v.handleBlur("until", until)}
              className={cn(errCls("until"))}
            />
            {v.getError("until") && (
              <p className="text-xs text-destructive mt-1">{v.getError("until")}</p>
            )}
            {currentEnd && !v.getError("until") && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Current end: {format(new Date(currentEnd), "MMM d, yyyy HH:mm")}
              </p>
            )}
          </div>
          <div>
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                v.handleChange("reason", e.target.value);
              }}
              onBlur={() => v.handleBlur("reason", reason)}
              placeholder="Why do you need more time?"
              maxLength={500}
              className={cn(errCls("reason"))}
            />
            <div className="flex justify-between mt-1">
              {v.getError("reason") ? (
                <p className="text-xs text-destructive">{v.getError("reason")}</p>
              ) : (
                <span />
              )}
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {reason.length}/500
              </p>
            </div>
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
          <Button onClick={submit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Submitting…" : "Request extension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
