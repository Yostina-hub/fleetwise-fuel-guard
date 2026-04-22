/**
 * RequestDetailDrawer — slide-in panel showing all info for one request.
 * Displays summary, status timeline, and the comment thread side-by-side.
 */
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  Car,
  Hash,
  FileText,
  Ban,
  CheckCircle2,
  Star,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { RequestTimeline, type TimelineRequest } from "./RequestTimeline";
import { RequestCommentsThread } from "./RequestCommentsThread";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ConfirmAndRateDialog } from "@/components/ratings/ConfirmAndRateDialog";
import { cn } from "@/lib/utils";

export interface RequestDetail extends TimelineRequest {
  id: string;
  request_number: string;
  purpose: string;
  destination: string | null;
  pool_location: string | null;
  needed_from: string;
  needed_until: string | null;
  passengers: number | null;
  priority: string | null;
  request_type: string | null;
  num_vehicles: number | null;
  trip_type: string | null;
  vehicle_type: string | null;
  assigned_vehicle?: { plate_number?: string; make?: string; model?: string } | null;
  assigned_driver?: { first_name?: string; last_name?: string } | null;
  requester_id: string;
  organization_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_vehicle_id?: string | null;
  driver_checked_out_at?: string | null;
  completed_at?: string | null;
  requester_confirmed_at?: string | null;
  departure_place?: string | null;
}

interface Props {
  request: RequestDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCancel: boolean;
}

const fmtDate = (s: string | null | undefined) =>
  s ? format(new Date(s), "MMM d, yyyy · HH:mm") : "—";

export function RequestDetailDrawer({ request, open, onOpenChange, canCancel }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const cancel = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Cancelled by requester",
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request cancelled", description: "Your request has been cancelled." });
      qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        title: "Could not cancel",
        description: e?.message ?? "Try again",
        variant: "destructive",
      }),
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!request) return null;
  const cancellable =
    canCancel && ["pending", "approved"].includes(request.status) && !request.cancelled_at;
  // The trip is "delivered" once the driver checks out OR the back-office
  // marks the request as completed. Confirmation by the requester is the
  // last step that fully closes the loop.
  const tripDelivered =
    request.status === "completed" ||
    !!request.driver_checked_out_at ||
    !!request.completed_at;
  const needsConfirmation = tripDelivered && !request.requester_confirmed_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <SheetTitle className="text-base font-semibold">{request.request_number}</SheetTitle>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
          <SheetDescription className="text-xs">
            Submitted {fmtDate(request.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Summary grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SummaryRow icon={FileText} label="Purpose" value={request.purpose} />
            <SummaryRow
              icon={MapPin}
              label="Destination"
              value={request.destination ?? "—"}
            />
            <SummaryRow icon={Calendar} label="Needed From" value={fmtDate(request.needed_from)} />
            <SummaryRow
              icon={Calendar}
              label="Needed Until"
              value={fmtDate(request.needed_until)}
            />
            <SummaryRow
              icon={Users}
              label="Passengers"
              value={request.passengers != null ? String(request.passengers) : "—"}
            />
            <SummaryRow
              icon={Car}
              label="Vehicle"
              value={
                request.assigned_vehicle
                  ? `${request.assigned_vehicle.plate_number ?? ""} · ${request.assigned_vehicle.make ?? ""} ${request.assigned_vehicle.model ?? ""}`.trim()
                  : "Not yet assigned"
              }
            />
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Status Timeline</h3>
            <RequestTimeline request={request} />
          </div>

          <Separator />

          {/* Comments */}
          <div className="min-h-[280px]">
            <RequestCommentsThread requestId={request.id} />
          </div>

          {/* Confirmation / rating call-to-action */}
          {tripDelivered && (
            <div
              className={cn(
                "rounded-lg border p-3 flex items-start gap-3",
                needsConfirmation
                  ? "border-primary/40 bg-primary/5"
                  : "border-success/40 bg-success/5",
              )}
            >
              {needsConfirmation ? (
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {needsConfirmation
                    ? "Confirm service delivery"
                    : "Service confirmed"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {needsConfirmation
                    ? "The driver has checked out. Please confirm and (optionally) rate."
                    : `Confirmed ${fmtDate(request.requester_confirmed_at)}.`}
                </div>
              </div>
              <Button
                size="sm"
                variant={needsConfirmation ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setConfirmOpen(true)}
              >
                {needsConfirmation ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm & rate
                  </>
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5" />
                    Rate trip
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Actions */}
          {cancellable && (
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel Request
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <ConfirmAndRateDialog
        request={request}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirmed={() => qc.invalidateQueries({ queryKey: ["my-vehicle-requests"] })}
      />
    </Sheet>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}
