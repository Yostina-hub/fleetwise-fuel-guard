/**
 * DriverViewRequestDialog
 * -----------------------
 * Read-only details view of a vehicle_request for the driver, with
 * clearly enumerated next-step actions:
 *   1. Pre-Trip inspection (before check-in)
 *   2. Check In  (records odometer, flips vehicle/driver status)
 *   3. Navigate to pickup / drop-off (opens Lemat/Google Maps)
 *   4. Report Issue / Request Fuel (during the trip)
 *   5. Post-Trip inspection (before check-out)
 *   6. Check Out (records odometer, completes the trip)
 *
 * Re-uses AssignmentCheckInDialog for multi-vehicle assignments and
 * inlines a single-vehicle check-in/out path for the parent
 * vehicle_request when there are no per-vehicle assignment rows.
 */
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  sanitizeNumeric,
  sanitizeWhileTyping,
  inputStatusClass,
} from "@/components/fleet/formSanitizers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Car, MapPin, Calendar, Users, FileText, AlertTriangle,
  Gauge, Wrench, Fuel, Navigation, PlayCircle, StopCircle,
  Clock, Hash, Building2, ClipboardCheck, CheckCircle2, XCircle, UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActiveRequest {
  id: string;
  request_number: string;
  status: string;
  approval_status?: string | null;
  purpose?: string | null;
  destination?: string | null;
  needed_from?: string | null;
  needed_until?: string | null;
  assigned_at?: string | null;
  driver_checked_in_at?: string | null;
  driver_checked_out_at?: string | null;
  assigned_vehicle_id?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  organization_id?: string | null;
  assigned_vehicle?: {
    id: string;
    plate_number: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    fuel_type?: string | null;
    status?: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  request: ActiveRequest | null;
  driverId?: string;
  onPreTrip: () => void;
  onPostTrip: () => void;
  onReportIssue: () => void;
  onRequestFuel: () => void;
}

const StatusPill = ({ status }: { status?: string | null }) => {
  if (!status) return null;
  const tone =
    status === "in_progress" ? "bg-primary/15 text-primary border-primary/30"
    : status === "assigned"   ? "bg-success/15 text-success border-success/30"
    : status === "approved"   ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("capitalize text-[10px]", tone)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
};

const Field = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-2">
    <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  </div>
);

export const DriverViewRequestDialog = ({
  open,
  onClose,
  request,
  driverId,
  onPreTrip,
  onPostTrip,
  onReportIssue,
  onRequestFuel,
}: Props) => {
  const queryClient = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [odoError, setOdoError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);

  const checkedIn = !!request?.driver_checked_in_at;
  const checkedOut = !!request?.driver_checked_out_at;

  // ---- Validation schemas ----
  // Odometer: required positive integer up to 9,999,999 km. Notes: optional, max 500.
  const odometerSchema = z
    .string()
    .trim()
    .min(1, "Odometer reading is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid number (e.g. 45200 or 45200.5)")
    .refine((v) => Number(v) > 0, "Odometer must be greater than 0")
    .refine((v) => Number(v) <= 9_999_999, "Odometer seems too high");
  const notesSchema = z.string().trim().max(500, "Notes must be 500 characters or less");

  const validateOdometer = (val: string, kind: "in" | "out"): number | null => {
    const parsed = odometerSchema.safeParse(val);
    if (!parsed.success) {
      setOdoError(parsed.error.issues[0]?.message ?? "Invalid odometer");
      return null;
    }
    const num = Number(parsed.data);
    // For check-out, ensure final reading is greater than the recorded check-in.
    if (kind === "out") {
      const startRaw = (request as any)?.checkin_odometer;
      const start = startRaw != null ? Number(startRaw) : null;
      if (start != null && Number.isFinite(start) && num <= start) {
        setOdoError(`Final odometer must be greater than starting (${start})`);
        return null;
      }
    }
    setOdoError(null);
    return num;
  };

  const validateNotes = (val: string): string | null => {
    const parsed = notesSchema.safeParse(val);
    if (!parsed.success) {
      setNotesError(parsed.error.issues[0]?.message ?? "Invalid notes");
      return null;
    }
    setNotesError(null);
    return parsed.data;
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-portal-self"] });
    queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
  };

  // Approval history (chain of approvers + decisions/comments)
  const { data: approvals = [] } = useQuery({
    queryKey: ["driver-portal-request-approvals", request?.id],
    enabled: !!request?.id && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("id, approval_level, approver_name, status, comments, decision_at, created_at, delegated_from_name")
        .eq("request_id", request!.id)
        .order("created_at", { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      const odo = validateOdometer(odometer, "in");
      const cleanedNotes = validateNotes(notes);
      if (odo == null) throw new Error("Please enter a valid odometer reading");
      if (notes && cleanedNotes == null) throw new Error("Please fix the notes field");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_in_at: new Date().toISOString(),
          checkin_odometer: odo,
          checkin_notes: cleanedNotes || null,
          status: "in_progress",
        })
        .eq("id", request.id);
      if (error) throw error;

      if (request.assigned_vehicle_id) {
        await (supabase as any)
          .from("vehicles")
          .update({ status: "in_use", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_vehicle_id);
      }
      if (driverId) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "on_trip", updated_at: new Date().toISOString() })
          .eq("id", driverId);
      }
    },
    onSuccess: () => {
      toast.success("Checked in — drive safely!");
      setOdometer("");
      setNotes("");
      setOdoError(null);
      setNotesError(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Check-in failed"),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      const odo = validateOdometer(odometer, "out");
      if (odo == null) throw new Error(odoError || "Please enter a valid final odometer");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_out_at: new Date().toISOString(),
          checkout_odometer: odo,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (error) throw error;

      if (request.assigned_vehicle_id) {
        await (supabase as any)
          .from("vehicles")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", request.assigned_vehicle_id);
      }
      if (driverId) {
        await (supabase as any)
          .from("drivers")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", driverId);
      }
    },
    onSuccess: () => {
      toast.success("Checked out — trip completed");
      setOdometer("");
      setNotes("");
      setOdoError(null);
      setNotesError(null);
      refresh();
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Check-out failed"),
  });

  const navigateTo = (place?: string | null) => {
    if (!place) return;
    const q = encodeURIComponent(place);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
  };

  const v = request?.assigned_vehicle;

  // Decide which "next step" stage we're in
  const stage = useMemo<"pre_trip" | "in_trip" | "post_trip" | "done">(() => {
    if (checkedOut) return "done";
    if (checkedIn) return "in_trip";
    return "pre_trip";
  }, [checkedIn, checkedOut]);

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Car className="w-5 h-5 text-primary" aria-hidden="true" />
            Trip Request
            <Badge variant="outline" className="text-xs font-mono">{request.request_number}</Badge>
            <StatusPill status={request.status} />
          </DialogTitle>
          <DialogDescription>
            Review your assignment and use the next-step actions below.
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle banner */}
        {v && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-start gap-3">
            <Car className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {v.plate_number} · {v.make || ""} {v.model || ""} {v.year ? `(${v.year})` : ""}
              </p>
              {v.fuel_type && (
                <p className="text-xs text-muted-foreground capitalize">Fuel: {v.fuel_type}</p>
              )}
            </div>
          </div>
        )}

        {/* Trip details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Field icon={FileText} label="Purpose" value={request.purpose} />
          <Field icon={MapPin} label="Destination" value={request.destination} />
          <Field
            icon={Calendar}
            label="Needed From"
            value={request.needed_from ? format(new Date(request.needed_from), "MMM dd, yyyy HH:mm") : null}
          />
          <Field
            icon={Calendar}
            label="Needed Until"
            value={request.needed_until ? format(new Date(request.needed_until), "MMM dd, yyyy HH:mm") : null}
          />
          {request.assigned_at && (
            <Field
              icon={Clock}
              label="Assigned At"
              value={format(new Date(request.assigned_at), "MMM dd, HH:mm")}
            />
          )}
          {request.approval_status && (
            <Field icon={ClipboardCheck} label="Approval" value={request.approval_status.replace(/_/g, " ")} />
          )}
          {request.driver_checked_in_at && (
            <Field
              icon={PlayCircle}
              label="Checked In"
              value={format(new Date(request.driver_checked_in_at), "MMM dd, HH:mm")}
            />
          )}
          {request.driver_checked_out_at && (
            <Field
              icon={StopCircle}
              label="Checked Out"
              value={format(new Date(request.driver_checked_out_at), "MMM dd, HH:mm")}
            />
          )}
        </div>

        <Separator />

        {/* Rejection banner */}
        {(request.status === "rejected" || request.approval_status === "rejected") && request.rejection_reason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
            <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Request Rejected</p>
              <p className="text-sm mt-0.5">{request.rejection_reason}</p>
              {request.rejected_at && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {format(new Date(request.rejected_at), "MMM dd, yyyy HH:mm")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Approval chain */}
        {approvals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Approval History
            </p>
            <div className="space-y-1.5">
              {approvals.map((a: any) => {
                const decided = a.status === "approved" || a.status === "rejected";
                const Icon = a.status === "approved" ? CheckCircle2 : a.status === "rejected" ? XCircle : Clock;
                const tone =
                  a.status === "approved" ? "text-success border-success/30 bg-success/5"
                  : a.status === "rejected" ? "text-destructive border-destructive/30 bg-destructive/5"
                  : "text-muted-foreground border-border bg-muted/30";
                return (
                  <div key={a.id} className={cn("rounded-lg border p-2 flex items-start gap-2", tone)}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{a.approver_name}</span>
                        {a.approval_level != null && (
                          <Badge variant="outline" className="text-[10px]">L{a.approval_level}</Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] capitalize", tone)}>
                          {a.status || "pending"}
                        </Badge>
                        {a.delegated_from_name && (
                          <span className="text-[10px] text-muted-foreground">
                            (delegated from {a.delegated_from_name})
                          </span>
                        )}
                        {decided && a.decision_at && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(new Date(a.decision_at), "MMM dd HH:mm")}
                          </span>
                        )}
                      </div>
                      {a.comments && (
                        <p className="text-xs text-foreground/80 mt-1 break-words">{a.comments}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Separator />

        {/* Next-step actions — hidden for rejected/cancelled requests */}
        {stage !== "done" && request.status !== "rejected" && request.status !== "cancelled" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next Steps
            </p>

            {stage === "pre_trip" && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => navigateTo(request.destination)}
                  disabled={!request.destination}
                >
                  <Navigation className="w-4 h-4" /> Open in Maps
                </Button>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-success" /> Check In
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Odometer (km)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={odometer}
                        onChange={(e) => {
                          const v = sanitizeNumeric(e.target.value);
                          setOdometer(v);
                          if (v) validateOdometer(v, "in");
                          else setOdoError(null);
                        }}
                        onBlur={() => odometer && validateOdometer(odometer, "in")}
                        placeholder="e.g. 45200"
                        aria-invalid={!!odoError}
                        className={inputStatusClass(odoError ? "error" : odometer ? "success" : "neutral")}
                      />
                      {odoError && (
                        <p className="text-xs text-destructive mt-1">{odoError}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => {
                          const v = sanitizeWhileTyping(e.target.value).slice(0, 500);
                          setNotes(v);
                          if (v) validateNotes(v);
                          else setNotesError(null);
                        }}
                        rows={1}
                        maxLength={500}
                        placeholder="Vehicle condition…"
                        aria-invalid={!!notesError}
                        className={inputStatusClass(notesError ? "error" : "neutral")}
                      />
                      {notesError && (
                        <p className="text-xs text-destructive mt-1">{notesError}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => checkIn.mutate()}
                    disabled={checkIn.isPending || !!odoError || !!notesError || !odometer}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {checkIn.isPending ? "Checking in…" : "Check In Now"}
                  </Button>
                </div>
              </>
            )}

            {stage === "in_trip" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => navigateTo(request.destination)}
                    disabled={!request.destination}
                  >
                    <Navigation className="w-4 h-4" /> Navigate
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={onReportIssue}>
                    <Wrench className="w-4 h-4" /> Report Issue
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={onRequestFuel}>
                    <Fuel className="w-4 h-4" /> Request Fuel
                  </Button>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <StopCircle className="w-4 h-4 text-warning" /> Check Out
                  </p>
                  <div>
                    <Label className="text-xs">Final Odometer (km)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={odometer}
                      onChange={(e) => {
                        const v = sanitizeNumeric(e.target.value);
                        setOdometer(v);
                        if (v) validateOdometer(v, "out");
                        else setOdoError(null);
                      }}
                      onBlur={() => odometer && validateOdometer(odometer, "out")}
                      placeholder="e.g. 45360"
                      aria-invalid={!!odoError}
                      className={inputStatusClass(odoError ? "error" : odometer ? "success" : "neutral")}
                    />
                    {odoError && (
                      <p className="text-xs text-destructive mt-1">{odoError}</p>
                    )}
                  </div>
                  <Button
                    className="w-full gap-2 bg-warning hover:bg-warning/90"
                    onClick={() => checkOut.mutate()}
                    disabled={checkOut.isPending || !!odoError || !odometer}
                  >
                    <StopCircle className="w-4 h-4" />
                    {checkOut.isPending ? "Checking out…" : "Check Out & Complete Trip"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === "done" && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-success" />
            <p className="text-sm font-medium">Trip completed. Great job!</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverViewRequestDialog;
