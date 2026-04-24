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
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RouteMapPreview } from "@/components/vehicle-requests/RouteMapPreview";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Car, MapPin, Calendar, Users, FileText, AlertTriangle,
  Gauge, Wrench, Fuel, Navigation, PlayCircle, StopCircle,
  Clock, Hash, Building2, ClipboardCheck, CheckCircle2, XCircle, UserCheck, RotateCcw,
  Sparkles, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DriverNavigateMapDialog } from "./DriverNavigateMapDialog";

interface ActiveRequest {
  id: string;
  request_number: string;
  status: string;
  approval_status?: string | null;
  purpose?: string | null;
  destination?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  departure_place?: string | null;
  departure_lat?: number | null;
  departure_lng?: number | null;
  needed_from?: string | null;
  needed_until?: string | null;
  assigned_at?: string | null;
  driver_checked_in_at?: string | null;
  driver_checked_out_at?: string | null;
  driver_checkin_odometer?: number | null;
  driver_checkout_odometer?: number | null;
  driver_checkin_notes?: string | null;
  driver_checkout_notes?: string | null;
  assigned_vehicle_id?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  organization_id?: string | null;
  requester_id?: string | null;
  requester_name?: string | null;
  requester_phone?: string | null;
  passengers?: number | null;
  passengers_count?: number | null;
  number_of_passengers?: number | null;
  department_name?: string | null;
  pool_location?: string | null;
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
  /** Called after the driver successfully checks out / completes the trip. */
  onCompleted?: () => void;
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
  onCompleted,
}: Props) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [completionRemark, setCompletionRemark] = useState("");
  const [completionRemarkError, setCompletionRemarkError] = useState<string | null>(null);
  const [navMapOpen, setNavMapOpen] = useState(false);
  const [confirmCheckOutOpen, setConfirmCheckOutOpen] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<string | null>(null);
  const [aiEstimateLoading, setAiEstimateLoading] = useState(false);
  const [aiEstimateError, setAiEstimateError] = useState<string | null>(null);

  const checkedIn = !!request?.driver_checked_in_at;
  const checkedOut = !!request?.driver_checked_out_at;

  // ---- Validation schemas ----
  const notesSchema = z.string().trim().max(500, "Notes must be 500 characters or less");
  const completionRemarkSchema = z
    .string()
    .trim()
    .min(1, "Completion remark is required")
    .max(500, "Completion remark must be 500 characters or less");

  const validateNotes = (val: string): string | null => {
    const parsed = notesSchema.safeParse(val);
    if (!parsed.success) {
      setNotesError(parsed.error.issues[0]?.message ?? "Invalid notes");
      return null;
    }
    setNotesError(null);
    return parsed.data;
  };

  const validateCompletionRemark = (val: string): string | null => {
    const parsed = completionRemarkSchema.safeParse(val);
    if (!parsed.success) {
      setCompletionRemarkError(parsed.error.issues[0]?.message ?? "Invalid completion remark");
      return null;
    }
    setCompletionRemarkError(null);
    return parsed.data;
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-portal-self"] });
    queryClient.invalidateQueries({ queryKey: ["driver-portal-trips"] });
    queryClient.invalidateQueries({ queryKey: ["driver-trip-history"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
  };
  // Hydrate latest request fields (requester, odometers, notes) so the
  // dialog always reflects the DB regardless of what the caller passed in.
  const { data: hydrated } = useQuery({
    queryKey: ["driver-portal-request-hydrate", request?.id],
    enabled: !!request?.id && open,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vehicle_requests")
        .select(
          "id, requester_id, requester_name, passengers, departure_place, departure_lat, departure_lng, destination, destination_lat, destination_lng, department_name, pool_location, assigned_by, assigned_at, driver_checkin_odometer, driver_checkout_odometer, driver_checkin_notes, driver_checkout_notes",
        )
        .eq("id", request!.id)
        .maybeSingle();
      return data || null;
    },
  });

  const requesterId = hydrated?.requester_id ?? request?.requester_id ?? null;
  const requesterNameDirect = hydrated?.requester_name ?? request?.requester_name ?? null;
  const passengers = hydrated?.passengers ?? request?.passengers ?? null;
  const departurePlace = hydrated?.departure_place ?? request?.departure_place ?? null;
  const departureLat = hydrated?.departure_lat ?? request?.departure_lat ?? null;
  const departureLng = hydrated?.departure_lng ?? request?.departure_lng ?? null;
  const departmentName = hydrated?.department_name ?? request?.department_name ?? null;
  const poolLocation = hydrated?.pool_location ?? request?.pool_location ?? null;
  const assignedById = hydrated?.assigned_by ?? null;
  const assignedAt = hydrated?.assigned_at ?? request?.assigned_at ?? null;

  // ---- AI route estimate (uses trip-route-ai-insight edge function) ----
  // Reset when the dialog closes or the request changes.
  useEffect(() => {
    if (!open) {
      setAiEstimate(null);
      setAiEstimateError(null);
      setAiEstimateLoading(false);
    }
  }, [open, request?.id]);

  const requestAiEstimate = async () => {
    if (!request) return;
    const destLat = hydrated?.destination_lat ?? request?.destination_lat ?? null;
    const destLng = hydrated?.destination_lng ?? request?.destination_lng ?? null;
    const hasOrigin =
      (departureLat != null && departureLng != null) || !!departurePlace;
    const hasDest = (destLat != null && destLng != null) || !!request.destination;
    if (!hasOrigin || !hasDest) {
      setAiEstimateError("Origin and destination are required");
      return;
    }

    setAiEstimateLoading(true);
    setAiEstimateError(null);
    setAiEstimate(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-route-ai-insight`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          origin: {
            lat: departureLat != null ? Number(departureLat) : 0,
            lng: departureLng != null ? Number(departureLng) : 0,
            label: departurePlace || "Departure",
          },
          destination: {
            lat: destLat != null ? Number(destLat) : 0,
            lng: destLng != null ? Number(destLng) : 0,
            label: request.destination || "Destination",
          },
          vehicleLabel:
            request.assigned_vehicle?.plate_number ||
            request.assigned_vehicle?.make ||
            null,
          departureTime: request.needed_from || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `AI request failed (${res.status})`);
      }
      setAiEstimate(json.insight || "No estimate returned.");
    } catch (e: any) {
      setAiEstimateError(e?.message || "Could not generate AI estimate");
    } finally {
      setAiEstimateLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setCompletionRemark((hydrated?.driver_checkout_notes ?? request?.driver_checkout_notes ?? "").trim());
    setCompletionRemarkError(null);
  }, [open, hydrated?.driver_checkout_notes, request?.driver_checkout_notes, request?.id]);

  const parseEmbeddedContactPhone = (value?: string | null) => {
    if (!value) return null;
    const match = value.match(/contact\s*phone\s*:\s*([^\n]+)/i);
    return match?.[1]?.trim() || null;
  };

  // Fetch requester contact details with profile -> employee -> embedded request fallback.
  const { data: requesterInfo } = useQuery({
    queryKey: ["driver-portal-requester-profile", requesterId],
    enabled: !!requesterId && open,
    queryFn: async () => {
      const [{ data: profile }, { data: employee }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("full_name, first_name, last_name, email, phone, job_title")
          .eq("id", requesterId)
          .maybeSingle(),
        (supabase as any)
          .from("employees")
          .select("first_name, last_name, email, phone, job_title")
          .eq("user_id", requesterId)
          .maybeSingle(),
      ]);
      return { profile: profile || null, employee: employee || null };
    },
  });

  // Dispatcher / assigner profile + role + employee-phone fallback.
  const { data: assignerInfo } = useQuery({
    queryKey: ["driver-portal-assigner-info", assignedById],
    enabled: !!assignedById && open,
    queryFn: async () => {
      const [{ data: profile }, { data: employee }, { data: roleRows }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("full_name, first_name, last_name, email, phone, job_title")
          .eq("id", assignedById)
          .maybeSingle(),
        (supabase as any)
          .from("employees")
          .select("first_name, last_name, email, phone, job_title")
          .eq("user_id", assignedById)
          .maybeSingle(),
        (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", assignedById),
      ]);
      const roles = Array.isArray(roleRows)
        ? roleRows.map((r: any) => String(r.role)).filter(Boolean)
        : [];
      return { profile: profile || null, employee: employee || null, roles };
    },
  });

  const profileFullName = (p: any) =>
    p?.full_name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() ||
    p?.email ||
    null;

  const requesterName =
    requesterNameDirect || profileFullName(requesterInfo?.profile) || profileFullName(requesterInfo?.employee) || null;
  const requesterPhone =
    requesterInfo?.profile?.phone || requesterInfo?.employee?.phone || parseEmbeddedContactPhone(request?.purpose) || null;
  const requesterEmail = requesterInfo?.profile?.email || requesterInfo?.employee?.email || null;

  const assignerName = profileFullName(assignerInfo?.profile) || profileFullName(assignerInfo?.employee);
  const assignerPhone = assignerInfo?.profile?.phone || assignerInfo?.employee?.phone || null;
  const assignerEmail = assignerInfo?.profile?.email || assignerInfo?.employee?.email || null;
  const assignerRole = (() => {
    const roles = assignerInfo?.roles ?? [];
    if (!roles.length) return assignerInfo?.profile?.job_title || assignerInfo?.employee?.job_title || null;
    const pretty = roles
      .map((r) => r.replace(/_/g, " "))
      .map((r) => r.replace(/\b\w/g, (m) => m.toUpperCase()));
    return pretty.join(", ");
  })();

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      const cleanedNotes = validateNotes(notes);
      if (notes && cleanedNotes == null) throw new Error("Please fix the notes field");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_in_at: new Date().toISOString(),
          driver_checkin_notes: cleanedNotes || null,
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
      setNotes("");
      setNotesError(null);
      refresh();
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Check-in failed"),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      const cleanedRemark = validateCompletionRemark(completionRemark);
      if (cleanedRemark == null) throw new Error("Please add a completion remark");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_out_at: new Date().toISOString(),
          driver_checkout_notes: cleanedRemark,
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
      setNotes("");
      setNotesError(null);
      setCompletionRemark("");
      setCompletionRemarkError(null);
      refresh();
      onClose();
      // Notify the parent so it can switch to the trip history tab (#10/#11).
      onCompleted?.();
    },
    onError: (e: any) => toast.error(e.message || "Check-out failed"),
  });

  // ---- Undo check-in (driver self-service, 5 min window) ----
  const UNDO_WINDOW_MS = 5 * 60 * 1000;
  const checkedInAtMs = request?.driver_checked_in_at
    ? new Date(request.driver_checked_in_at).getTime()
    : null;

  // Tick once a second so the remaining-time label & disabled state stay live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!checkedIn || checkedOut) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [checkedIn, checkedOut]);

  const undoMsLeft =
    checkedInAtMs != null ? Math.max(0, UNDO_WINDOW_MS - (now - checkedInAtMs)) : 0;
  const canUndoCheckIn = checkedIn && !checkedOut && undoMsLeft > 0;
  const undoSecondsLeft = Math.ceil(undoMsLeft / 1000);

  const undoCheckIn = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("No request");
      if (!canUndoCheckIn) throw new Error("Undo window has expired");
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({
          driver_checked_in_at: null,
          driver_checkin_notes: null,
          status: "assigned",
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
      toast.success("Check-in undone");
      setNotes("");
      setNotesError(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Could not undo check-in"),
  });

  /** Build a driving-directions URL using whichever endpoints we have. */
  const buildDirectionsUrl = (): string | null => {
    const dest = request?.destination?.trim();
    const originLatLng =
      departureLat != null && departureLng != null &&
      Number.isFinite(Number(departureLat)) && Number.isFinite(Number(departureLng))
        ? `${departureLat},${departureLng}`
        : null;
    const originText = departurePlace?.trim();
    const destPart = dest ? encodeURIComponent(dest) : null;
    if (!destPart) {
      if (originLatLng) return `https://www.google.com/maps/search/?api=1&query=${originLatLng}`;
      if (originText) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originText)}`;
      return null;
    }
    const originPart = originLatLng || (originText ? encodeURIComponent(originText) : null);
    if (originPart) {
      return `https://www.google.com/maps/dir/?api=1&origin=${originPart}&destination=${destPart}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destPart}&travelmode=driving`;
  };

  const openMaps = (url: string | null) => {
    if (!url) return;
    // Lovable preview runs inside a sandboxed iframe — `window.open` can be
    // blocked. Try top-level window.open first, then anchor click, then
    // direct top navigation as a final fallback.
    try {
      const w = (window.top || window).open(url, "_blank", "noopener,noreferrer");
      if (w) return;
    } catch { /* fall through */ }
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      try {
        window.top!.location.href = url;
      } catch {
        window.location.href = url;
      }
    }
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
          <Field
            icon={UserCheck}
            label="Requester"
            value={
              requesterName ? (
                <span className="space-y-0.5 inline-block align-top">
                  <span className="block">{requesterName}</span>
                  {requesterPhone && (
                    <a
                      href={`tel:${requesterPhone}`}
                      className="block text-xs text-primary hover:underline"
                    >
                      📞 {requesterPhone}
                    </a>
                  )}
                  {requesterEmail && (
                    <a
                      href={`mailto:${requesterEmail}`}
                      className="block text-xs text-muted-foreground hover:underline break-all"
                    >
                      ✉️ {requesterEmail}
                    </a>
                  )}
                </span>
              ) : null
            }
          />
          <Field
            icon={UserCheck}
            label="Assigned By"
            value={
              assignerName ? (
                <span className="space-y-0.5 inline-block align-top">
                  <span className="block">{assignerName}</span>
                  {assignerRole && (
                    <span className="block text-xs text-muted-foreground capitalize">
                      {assignerRole}
                    </span>
                  )}
                  {assignerPhone && (
                    <a
                      href={`tel:${assignerPhone}`}
                      className="block text-xs text-primary hover:underline"
                    >
                      📞 {assignerPhone}
                    </a>
                  )}
                  {assignerEmail && (
                    <a
                      href={`mailto:${assignerEmail}`}
                      className="block text-xs text-muted-foreground hover:underline break-all"
                    >
                      ✉️ {assignerEmail}
                    </a>
                  )}
                  {assignedAt && (
                    <span className="block text-[11px] text-muted-foreground">
                      {format(new Date(assignedAt), "MMM dd, yyyy HH:mm")}
                    </span>
                  )}
                </span>
              ) : null
            }
          />
          <Field
            icon={Users}
            label="Passengers"
            value={passengers != null ? String(passengers) : null}
          />
          {departmentName && (
            <Field icon={Building2} label="Department" value={departmentName} />
          )}
          <Field icon={FileText} label="Purpose" value={request.purpose} />
          <Field
            icon={MapPin}
            label="Departure"
            value={departurePlace || poolLocation}
          />
          <Field icon={Navigation} label="Destination" value={request.destination} />
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

        {/* Inline route preview — always visible to the driver */}
        {(departureLat != null || departurePlace || request.destination) && (
          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Route Preview</span>
              <span className="text-[11px] text-muted-foreground ml-auto truncate">
                {departurePlace || "Start"} → {request.destination || "Destination"}
              </span>
            </div>
            <RouteMapPreview
              departure={{
                lat: departureLat ?? null,
                lng: departureLng ?? null,
                label: departurePlace || poolLocation || "Start",
              }}
              destination={{
                lat: hydrated?.destination_lat ?? request?.destination_lat ?? null,
                lng: hydrated?.destination_lng ?? request?.destination_lng ?? null,
                label: (hydrated?.destination ?? request.destination) || "Destination",
              }}
              heightPx={220}
            />
          </div>
        )}

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


        {/* Next-step actions — hidden for rejected/cancelled requests */}
        {stage !== "done" && request.status !== "rejected" && request.status !== "cancelled" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next Steps
            </p>

            {stage === "pre_trip" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => setNavMapOpen(true)}
                    disabled={!departurePlace && departureLat == null && !request.destination}
                  >
                    <Navigation className="w-4 h-4" /> Show Route on Map
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => openMaps(buildDirectionsUrl())}
                    disabled={!request.destination && !departurePlace && departureLat == null}
                  >
                    <MapPin className="w-4 h-4" /> Open in Google Maps
                  </Button>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-success" /> Check In
                  </p>
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
                      rows={2}
                      maxLength={500}
                      placeholder="Vehicle condition…"
                      aria-invalid={!!notesError}
                      className={inputStatusClass(notesError ? "error" : "neutral")}
                    />
                    {notesError && (
                      <p className="text-xs text-destructive mt-1">{notesError}</p>
                    )}
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => checkIn.mutate()}
                    disabled={checkIn.isPending || !!notesError}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {checkIn.isPending ? "Starting…" : "Start Now"}
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
                    onClick={() => setNavMapOpen(true)}
                    disabled={!request.destination && !departurePlace && departureLat == null}
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

                {canUndoCheckIn && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Checked in by mistake?</p>
                      <p className="text-xs text-muted-foreground">
                        You can undo within{" "}
                        <span className="font-mono">
                          {Math.floor(undoSecondsLeft / 60)}:
                          {String(undoSecondsLeft % 60).padStart(2, "0")}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-warning/40 text-warning hover:bg-warning/10"
                      onClick={() => undoCheckIn.mutate()}
                      disabled={undoCheckIn.isPending}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {undoCheckIn.isPending ? "Undoing…" : "Undo Check-In"}
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <StopCircle className="w-4 h-4 text-warning" /> Check Out
                  </p>
                  <div>
                    <Label className="text-xs">Completion remark</Label>
                    <Textarea
                      value={completionRemark}
                      onChange={(e) => {
                        const v = sanitizeWhileTyping(e.target.value).slice(0, 500);
                        setCompletionRemark(v);
                        validateCompletionRemark(v);
                      }}
                      rows={3}
                      maxLength={500}
                      placeholder="Trip completed, delivered successfully…"
                      aria-invalid={!!completionRemarkError}
                      className={inputStatusClass(completionRemarkError ? "error" : "neutral")}
                    />
                    {completionRemarkError && (
                      <p className="text-xs text-destructive mt-1">{completionRemarkError}</p>
                    )}
                  </div>
                  <Button
                    className="w-full gap-2 bg-warning hover:bg-warning/90"
                    onClick={() => setConfirmCheckOutOpen(true)}
                    disabled={checkOut.isPending || !completionRemark.trim() || !!completionRemarkError}
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

      <DriverNavigateMapDialog
        open={navMapOpen}
        onClose={() => setNavMapOpen(false)}
        departurePlace={departurePlace}
        departureLat={departureLat}
        departureLng={departureLng}
        destinationPlace={request.destination}
        vehicleId={request.assigned_vehicle_id || request.assigned_vehicle?.id || null}
        vehicleLabel={
          request.assigned_vehicle
            ? `${request.assigned_vehicle.plate_number}${request.assigned_vehicle.make ? ` · ${request.assigned_vehicle.make} ${request.assigned_vehicle.model || ""}` : ""}`
            : null
        }
        departureTime={request.needed_from}
      />

      {/* Confirmation dialog before final check-out (#9) */}
      <AlertDialog open={confirmCheckOutOpen} onOpenChange={setConfirmCheckOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to finish this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will check you out, mark the trip as <strong>completed</strong>, and free up the
              vehicle. You won't be able to undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkOut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                checkOut.mutate(undefined, {
                  onSettled: () => setConfirmCheckOutOpen(false),
                });
              }}
              disabled={checkOut.isPending}
              className="bg-warning hover:bg-warning/90"
            >
              {checkOut.isPending ? "Finishing…" : "Yes, finish trip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default DriverViewRequestDialog;
