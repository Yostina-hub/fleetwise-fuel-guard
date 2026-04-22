/**
 * RateTripDialog
 * --------------
 * State-of-the-art trip rating modal. Walks the user through 3 short steps
 * (Driver → Vehicle → Punctuality) with animated transitions, then a
 * comment + summary card. Saves to vehicle_requests; the DB trigger
 * computes the overall rating and stamps `rated_at`.
 */
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  UserRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";
import type { PendingRatingTrip } from "@/hooks/usePendingRatings";

interface RateTripDialogProps {
  trip: PendingRatingTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4; // 0=driver, 1=vehicle, 2=punctuality, 3=review, 4=thank-you

const STEPS = [
  { key: "driver", label: "Driver", icon: UserRound, prompt: "How was your driver?", help: "Courtesy, safety, professionalism" },
  { key: "vehicle", label: "Vehicle", icon: Car, prompt: "How was the vehicle?", help: "Cleanliness, comfort, condition" },
  { key: "punctuality", label: "Punctuality", icon: Clock, prompt: "Was the trip on time?", help: "Pickup and arrival timing" },
] as const;

export function RateTripDialog({ trip, open, onOpenChange, onRated }: RateTripDialogProps) {
  const qc = useQueryClient();
  const [step, setStep] = React.useState<Step>(0);
  const [driver, setDriver] = React.useState(0);
  const [vehicle, setVehicle] = React.useState(0);
  const [punctuality, setPunctuality] = React.useState(0);
  const [comment, setComment] = React.useState("");

  // Reset on close / trip change.
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(0); setDriver(0); setVehicle(0); setPunctuality(0); setComment("");
      }, 200);
    }
  }, [open]);

  const overall = React.useMemo(() => {
    if (!driver || !vehicle || !punctuality) return 0;
    return Math.round((driver + vehicle + punctuality) / 3);
  }, [driver, vehicle, punctuality]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!trip) throw new Error("No trip selected");
      const { error } = await supabase
        .from("vehicle_requests")
        .update({
          driver_rating: driver,
          vehicle_rating: vehicle,
          punctuality_rating: punctuality,
          rating_comment: comment.trim() || null,
          requester_feedback: comment.trim() || null,
        })
        .eq("id", trip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback! 🎉", {
        description: "Your rating has been recorded.",
      });
      qc.invalidateQueries({ queryKey: ["pending-ratings"] });
      qc.invalidateQueries({ queryKey: ["vehicle-requests"] });
      qc.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onRated?.();
      setStep(4); // show confirmation/thank-you screen instead of closing
    },
    onError: (e: any) => {
      toast.error("Could not save rating", { description: e.message });
    },
  });

  if (!trip) return null;

  const currentValue = step === 0 ? driver : step === 1 ? vehicle : step === 2 ? punctuality : 0;
  const setCurrent = step === 0 ? setDriver : step === 1 ? setVehicle : setPunctuality;
  const canProceed = step === 3 ? overall > 0 : currentValue > 0;
  const completedAt = trip.completed_at || trip.driver_checked_out_at;

  return (
    <Dialog open={open} onOpenChange={(o) => !submit.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 pt-6 pb-4 border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-semibold tracking-wider uppercase">
                Rate your trip
              </Badge>
            </div>
            <DialogTitle className="text-xl font-semibold">
              {trip.request_number}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {trip.departure_place && trip.destination
                ? `${trip.departure_place} → ${trip.destination}`
                : trip.purpose}
              {completedAt && (
                <span className="block text-xs text-muted-foreground/80 mt-0.5">
                  Completed {format(new Date(completedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="relative mt-4 flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => {
              const ratings = [driver, vehicle, punctuality];
              const done = i < step || (i <= 2 && ratings[i] > 0);
              const active = i === step;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    done ? "bg-primary" : active ? "bg-primary/40" : "bg-border",
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[260px] flex flex-col">
          {step < 3 ? (() => {
            const s = STEPS[step as 0 | 1 | 2];
            const Icon = s.icon;
            return (
              <div key={step} className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{s.prompt}</h3>
                <p className="text-sm text-muted-foreground mb-6">{s.help}</p>
                <StarRating value={currentValue} onChange={setCurrent} size="lg" />
                <p className="mt-6 text-xs text-muted-foreground">
                  Step {step + 1} of {STEPS.length + 1}
                </p>
              </div>
            );
          })() : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Your ratings</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold text-primary">{overall}</span>
                    <span className="text-xs text-muted-foreground">/ 5 overall</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Driver", value: driver, icon: UserRound },
                    { label: "Vehicle", value: vehicle, icon: Car },
                    { label: "Punctuality", value: punctuality, icon: Clock },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <row.icon className="h-3.5 w-3.5" />
                        {row.label}
                      </div>
                      <StarRating value={row.value} onChange={() => {}} size="sm" disabled showLabel={false} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Add a comment <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  placeholder="What went well? What could be better?"
                  rows={3}
                  className="resize-none"
                />
                <div className="text-right text-[10px] text-muted-foreground mt-1">
                  {comment.length}/500
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0 || submit.isPending}
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              size="sm"
              disabled={!canProceed}
              onClick={() => setStep((s) => ((s + 1) as Step))}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={submit.isPending || !canProceed}
              onClick={() => submit.mutate()}
              className="min-w-[140px]"
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit rating
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RateTripDialog;
