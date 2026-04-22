/**
 * PendingRatingsBlocker
 * ---------------------
 * Inline alert shown above the new-vehicle-request form when the requester
 * has prior completed trips that haven't been rated. The DB also enforces
 * this with a trigger; this UI gives immediate, friendly feedback.
 */
import * as React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { RateTripDialog } from "./RateTripDialog";

interface Props {
  className?: string;
  /** Optional callback when all pending ratings are cleared. */
  onAllRated?: () => void;
}

export function PendingRatingsBlocker({ className, onAllRated }: Props) {
  const { data: pending = [], isLoading } = usePendingRatings();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoading && pending.length === 0) {
      onAllRated?.();
    }
  }, [isLoading, pending.length, onAllRated]);

  if (isLoading || pending.length === 0) return null;

  const active = pending.find((p) => p.id === activeId) ?? null;

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-warning/40 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-4 shadow-sm",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 ring-1 ring-warning/40">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">Rate your previous trips first</h4>
              <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning text-[10px]">
                {pending.length} pending
              </Badge>
              <Link
                to="/trip-reviews"
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                View all reviews
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              You must rate all completed trips before submitting a new vehicle request.
              It only takes 20 seconds.
            </p>

            <div className="mt-3 space-y-2">
              {pending.slice(0, 3).map((trip) => {
                const completedAt = trip.completed_at || trip.driver_checked_out_at;
                return (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-foreground/90">
                          {trip.request_number}
                        </span>
                        {completedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(completedAt), "MMM d")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {trip.departure_place && trip.destination
                          ? `${trip.departure_place} → ${trip.destination}`
                          : trip.purpose}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-3 text-xs gap-1.5 shrink-0"
                      onClick={() => setActiveId(trip.id)}
                    >
                      <Star className="h-3 w-3" />
                      Rate
                    </Button>
                  </div>
                );
              })}
              {pending.length > 3 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  + {pending.length - 3} more after these
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <RateTripDialog
        trip={active}
        open={!!active}
        onOpenChange={(o) => !o && setActiveId(null)}
      />
    </>
  );
}

export default PendingRatingsBlocker;
