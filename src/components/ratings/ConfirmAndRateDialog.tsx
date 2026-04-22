/**
 * ConfirmAndRateDialog
 * --------------------
 * Shown to the requester after the driver checks out. Walks them through:
 *   1. Confirm trip completion (required, closes the loop)
 *   2. Optional 4-criteria rating + comment + dispute flag
 *
 * Writes:
 *   - vehicle_requests.requester_confirmed_at / _by / _notes  (mandatory step)
 *   - vehicle_request_ratings (new row, optional rating)
 */
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Star,
  AlertTriangle,
  Loader2,
  Car,
  UserRound,
  Clock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface MinimalRequest {
  id: string;
  request_number?: string | null;
  organization_id?: string | null;
  destination?: string | null;
  pool_location?: string | null;
  departure_place?: string | null;
  purpose?: string | null;
  completed_at?: string | null;
  driver_checked_out_at?: string | null;
  assigned_driver_id?: string | null;
  assigned_vehicle_id?: string | null;
}

interface Props {
  request: MinimalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: () => void;
}

type Phase = "confirm" | "rate";

const CRITERIA = [
  {
    key: "driver" as const,
    label: "Driver professionalism",
    helper: "Courtesy, safety, communication",
    icon: UserRound,
  },
  {
    key: "vehicle" as const,
    label: "Vehicle condition",
    helper: "Cleanliness, comfort, mechanical state",
    icon: Car,
  },
  {
    key: "punctuality" as const,
    label: "Punctuality",
    helper: "Pickup and arrival on time",
    icon: Clock,
  },
  {
    key: "overall" as const,
    label: "Overall experience",
    helper: "How satisfied are you overall?",
    icon: Sparkles,
  },
];

type Scores = Record<"driver" | "vehicle" | "punctuality" | "overall", number>;

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => {
        const active = s <= (hover || value);
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(s)}
            aria-label={`${s} star${s > 1 ? "s" : ""}`}
            className={cn(
              "p-0.5 rounded-sm transition-transform",
              !disabled && "hover:scale-110",
            )}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30",
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">{value}/5</span>
      )}
    </div>
  );
}

export function ConfirmAndRateDialog({
  request,
  open,
  onOpenChange,
  onConfirmed,
}: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const [phase, setPhase] = React.useState<Phase>("confirm");
  const [confirmNotes, setConfirmNotes] = React.useState("");
  const [scores, setScores] = React.useState<Scores>({
    driver: 0,
    vehicle: 0,
    punctuality: 0,
    overall: 0,
  });
  const [comment, setComment] = React.useState("");
  const [disputeFlagged, setDisputeFlagged] = React.useState(false);
  const [disputeReason, setDisputeReason] = React.useState("");

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("confirm");
        setConfirmNotes("");
        setScores({ driver: 0, vehicle: 0, punctuality: 0, overall: 0 });
        setComment("");
        setDisputeFlagged(false);
        setDisputeReason("");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const completedAt = request?.completed_at || request?.driver_checked_out_at;
  const orgId = request?.organization_id || organizationId;

  // Step 1: confirm trip completion
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("Missing request");
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("vehicle_requests")
        .update({
          requester_confirmed_at: new Date().toISOString(),
          requester_confirmed_by: authUser.id,
          requester_confirmation_notes: confirmNotes.trim() || null,
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trip confirmed", {
        description: "Thanks for closing the loop. You can rate now or skip.",
      });
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      qc.invalidateQueries({ queryKey: ["vehicle-requests"] });
      qc.invalidateQueries({ queryKey: ["pending-ratings"] });
      onConfirmed?.();
      setPhase("rate");
    },
    onError: (e: any) =>
      toast.error("Could not confirm", { description: e?.message }),
  });

  // Step 2: optional rating
  const rateMutation = useMutation({
    mutationFn: async () => {
      if (!request || !orgId) throw new Error("Missing context");
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const anyScore =
        scores.driver || scores.vehicle || scores.punctuality || scores.overall;
      if (!anyScore && !disputeFlagged) {
        return { skipped: true } as const;
      }
      if (disputeFlagged && disputeReason.trim().length < 5) {
        throw new Error(
          "Please describe the issue (at least a few words) before flagging it.",
        );
      }

      const { data: requestRow, error: requestError } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, organization_id, requester_id, assigned_driver_id, assigned_vehicle_id",
        )
        .eq("id", request.id)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!requestRow) throw new Error("Trip not found");
      if (requestRow.requester_id !== authUser.id) {
        throw new Error("You can only rate your own trip.");
      }

      const resolvedOrgId = requestRow.organization_id || orgId;
      if (!resolvedOrgId) throw new Error("Missing organization for this trip");

      const payload = {
        organization_id: resolvedOrgId,
        vehicle_request_id: request.id,
        rated_by: authUser.id,
        driver_id: requestRow.assigned_driver_id ?? request.assigned_driver_id ?? null,
        vehicle_id: requestRow.assigned_vehicle_id ?? request.assigned_vehicle_id ?? null,
        driver_score: scores.driver || null,
        vehicle_score: scores.vehicle || null,
        punctuality_score: scores.punctuality || null,
        overall_score: scores.overall || null,
        comment: comment.trim() || null,
        dispute_flagged: disputeFlagged,
        dispute_reason: disputeFlagged ? disputeReason.trim() : null,
      };

      const { data: existingRating, error: existingRatingError } = await (supabase as any)
        .from("vehicle_request_ratings")
        .select("id")
        .eq("vehicle_request_id", request.id)
        .eq("rated_by", authUser.id)
        .maybeSingle();

      if (existingRatingError) throw existingRatingError;

      const { error } = existingRating
        ? await (supabase as any)
            .from("vehicle_request_ratings")
            .update(payload)
            .eq("id", existingRating.id)
            .eq("rated_by", authUser.id)
        : await (supabase as any)
            .from("vehicle_request_ratings")
            .insert(payload);

      if (error) throw error;

      const { error: requestUpdateError } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          rated_at: new Date().toISOString(),
          requester_feedback: comment.trim() || null,
        })
        .eq("id", request.id)
        .eq("requester_id", authUser.id);

      if (requestUpdateError) throw requestUpdateError;
      return { skipped: false } as const;
    },
    onSuccess: (res) => {
      if (res?.skipped) {
        toast.message("Rating skipped", {
          description: "You can come back to rate this trip anytime.",
        });
      } else if (disputeFlagged) {
        toast.success("Thanks — your report has been sent to fleet operations.", {
          description: "A manager will review the issue.",
        });
      } else {
        toast.success("Thanks for the feedback!");
      }
      qc.invalidateQueries({ queryKey: ["vehicle-request-ratings"] });
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      qc.invalidateQueries({ queryKey: ["pending-ratings"] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast.error("Could not submit rating", { description: e?.message }),
  });

  if (!request) return null;

  const canConfirm = !confirmMutation.isPending;
  const tripLine =
    request.departure_place && request.destination
      ? `${request.departure_place} → ${request.destination}`
      : request.destination || request.purpose || "Trip";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Don't allow closing while a write is in flight.
        if (confirmMutation.isPending || rateMutation.isPending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 pt-6 pb-4 border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary text-[10px] font-semibold tracking-wider uppercase"
              >
                {phase === "confirm" ? "Confirm service" : "Rate your trip"}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-semibold">
              {request.request_number || "Vehicle request"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {tripLine}
              {completedAt && (
                <span className="block text-xs text-muted-foreground/80 mt-0.5">
                  Completed{" "}
                  {format(new Date(completedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {phase === "confirm" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm text-foreground/90">
                Please confirm that the vehicle and driver delivered the service
                you requested. This closes the trip in our records.
              </p>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Notes (optional)
                </Label>
                <Textarea
                  value={confirmNotes}
                  onChange={(e) =>
                    setConfirmNotes(e.target.value.slice(0, 500))
                  }
                  rows={3}
                  placeholder="Any handover notes, missing items, or remarks…"
                  className="resize-none mt-1"
                />
                <div className="text-right text-[10px] text-muted-foreground mt-1">
                  {confirmNotes.length}/500
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  After confirmation you'll have the option to rate the driver
                  and vehicle, or report an issue. Rating is optional.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-md border border-success/40 bg-success/5 p-3 text-xs text-success-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Trip confirmed. Rating below is optional.
              </div>

              <div className="space-y-4">
                {CRITERIA.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <c.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.helper}
                        </div>
                      </div>
                    </div>
                    <StarRow
                      value={scores[c.key]}
                      onChange={(v) =>
                        setScores((s) => ({ ...s, [c.key]: v }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Comment (optional)
                </Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="What went well? What could be better?"
                  className="resize-none mt-1"
                />
                <div className="text-right text-[10px] text-muted-foreground mt-1">
                  {comment.length}/1000
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDisputeFlagged((v) => !v)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md border p-3 text-left transition-colors",
                    disputeFlagged
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border bg-muted/20 hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4",
                        disputeFlagged
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    />
                    <div>
                      <div className="text-sm font-medium">
                        Report an issue
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Escalate this trip to fleet operations for review.
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={disputeFlagged ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {disputeFlagged ? "Flagged" : "Off"}
                  </Badge>
                </button>
                {disputeFlagged && (
                  <Textarea
                    value={disputeReason}
                    onChange={(e) =>
                      setDisputeReason(e.target.value.slice(0, 1000))
                    }
                    rows={3}
                    placeholder="Describe the issue — late arrival, vehicle damage, behaviour, etc."
                    className="resize-none"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
          {phase === "confirm" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={confirmMutation.isPending}
              >
                Later
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canConfirm}
                onClick={() => confirmMutation.mutate()}
                className="min-w-[180px]"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm completion
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => rateMutation.mutate()}
                disabled={rateMutation.isPending}
              >
                Skip rating
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={rateMutation.isPending}
                onClick={() => rateMutation.mutate()}
                className="min-w-[180px]"
              >
                {rateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : disputeFlagged ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Submit report
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit rating
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmAndRateDialog;
