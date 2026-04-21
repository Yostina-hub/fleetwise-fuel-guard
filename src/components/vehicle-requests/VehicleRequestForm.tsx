import { useState, useMemo, useEffect } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useAuth } from "@/hooks/useAuth";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Users, Car, Route, UserCog, X, MapPin, Layers, FileText, Sparkles, CalendarDays, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Moon } from "lucide-react";
import { FieldHint } from "@/components/ui/field-hint";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DateTimePicker, combineDateAndTime } from "@/components/ui/date-time-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import { VEHICLE_TYPES_OPTIONS, ASSIGNED_POOLS } from "@/components/fleet/formConstants";
import { AlertCircle } from "lucide-react";
import { useVehicleRequestValidation } from "./useVehicleRequestValidation";
import { sanitizeVehicleRequestForm, vehicleRequestZodSchema } from "./vehicleRequestValidation";
import { VRField } from "./VRField";
import { deriveVisibility } from "./visibility";
import { PendingRatingsBlocker } from "@/components/ratings/PendingRatingsBlocker";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { MyVehicleRequestsSummary } from "./MyVehicleRequestsSummary";
import { useDepartments } from "@/hooks/useDepartments";
import {
  recommendVehicleClass,
  isUpgradeOverRecommendation,
  getVehicleClassProfile,
  COST_BAND_LABELS,
  COST_BAND_TONE,
  BUSINESS_PURPOSE_CATEGORIES,
  BUSINESS_PURPOSE_GROUPS,
  CARGO_LOAD_OPTIONS,
  type CargoLoad,
} from "@/lib/vehicle-requests/vehicleClassRecommendation";

interface VehicleRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  /** When true, render inline (no outer Dialog) — used by the unified FormRenderer. */
  embedded?: boolean;
  /** Optional prefill values (e.g. from workflow context). Only basic fields are mapped. */
  prefill?: Record<string, any>;
  /** Called after a successful submission with the created request id (embedded mode). */
  onSubmitted?: (result: { id: string }) => void;
}

const POOL_HIERARCHY: Record<string, string[]> = {
  corporate: ["FAN", "TPO", "HQ"],
  zone: ["SWAAZ", "EAAZ"],
  region: ["NR", "SR"],
};

/**
 * Build a "HH:MM" string from a Date, rounded *up* to the next 5-minute mark.
 * Used so the form's default Start Time always reflects the requester's
 * current machine time (not a stale 08:00) and is never already in the past
 * by the time they finish filling the form.
 */
const roundedNowHHMM = (offsetMinutes = 0): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  // round up to next 5-min boundary
  const rem = d.getMinutes() % 5;
  if (rem !== 0) d.setMinutes(d.getMinutes() + (5 - rem));
  d.setSeconds(0, 0);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const buildInitialForm = () => ({
  request_type: "daily_operation",
  date: undefined as Date | undefined,
  // Times must be explicitly entered by the user — no defaults so the
  // validation can flag empty fields instead of silently accepting "now".
  start_time: "",
  end_time: "",
  start_date: undefined as Date | undefined,
  start_date_time: "",
  end_date: undefined as Date | undefined,
  end_date_time: "",
  departure_place: "",
  destination: "",
  departure_lat: null as number | null,
  departure_lng: null as number | null,
  destination_lat: null as number | null,
  destination_lng: null as number | null,
  // Optional ordered intermediate stops between Departure and final Destination.
  // Persisted to `vehicle_request_stops` (sequence-ordered waypoints).
  stops: [] as Array<{ name: string; lat: number | null; lng: number | null }>,
  num_vehicles: "1",
  passengers: "1",
  vehicle_type: "",
  trip_type: "",
  pool_category: "",
  pool_name: "",
  purpose: "",
  department_id: "" as string,
  project_number: "",
  // New: priority + contact phone — surfaced for dispatch/approver context.
  priority: "normal",
  contact_phone: "",
  // Resource-aware request fields (demand-shaping pattern).
  purpose_category: "" as string,                  // business taxonomy — required
  cargo_load: "" as CargoLoad | "",                // mandatory — drives recommendation engine
  vehicle_type_justification: "" as string,        // required when user upgrades over recommendation
});

const initialForm = buildInitialForm();

// FieldHint is imported from @/components/ui/field-hint so all forms share
// the same (i)-on-hover tooltip styling and a11y semantics.


export const VehicleRequestForm = ({ open, onOpenChange, source, embedded, prefill, onSubmitted }: VehicleRequestFormProps) => {
  const { t } = useTranslation();
  const { organizationId, isSuperAdmin } = useOrganization();
  const {
    user,
    profile,
    roles: userRoles,
    isImpersonating,
    realUser,
    realProfile,
    realRoles,
  } = useAuth();
  const queryClient = useQueryClient();
  const { departments } = useDepartments();

  // When a super_admin is impersonating, the override puts the impersonated
  // user into `useAuth().user` — but `supabase.auth.getUser()` still returns
  // the super_admin's JWT identity. Treat impersonation as a first-class
  // "on behalf of" so inserts get the impersonated user's id and approval
  // routing uses their role (not the super_admin's auto-approve).
  const isRealSuperAdmin =
    isImpersonating || realRoles.some((r) => r.role === "super_admin") || isSuperAdmin;

  // Drivers cannot initiate fleet/vehicle requests — only end-users, supervisors,
  // and managers can. A user counts as "driver-only" when they hold the driver
  // role and no other role that grants requestor privileges.
  const roleNames = userRoles.map((r) => r.role);
  const isDriverOnly =
    roleNames.includes("driver") &&
    !isSuperAdmin &&
    !roleNames.some((r) => r !== "driver");

  // "File on behalf of" is permitted for managers + admins. This widens the
  // capability beyond super_admin so dispatchers/supervisors can submit on
  // behalf of drivers or staff who don't have system access. Every such
  // submission is structurally audited via filed_by_user_id / filed_on_behalf.
  const ON_BEHALF_ROLES = new Set([
    "super_admin",
    "org_admin",
    "operations_manager",
    "fleet_manager",
    "dispatcher",
    "supervisor",
  ]);
  const canFileOnBehalf =
    isSuperAdmin || roleNames.some((r) => ON_BEHALF_ROLES.has(r));

  // Persist in-progress form per (user, source) so progress isn't lost on
  // accidental close, refresh, navigation, or browser crash.
  const draftKey = user?.id ? `vehicle-request:${user.id}:${source ?? "default"}` : null;
  const initialWithPrefill = useMemo(() => ({
    ...initialForm,
    ...(prefill?.purpose ? { purpose: String(prefill.purpose) } : {}),
    ...(prefill?.departure_place ? { departure_place: String(prefill.departure_place) } : {}),
    ...(prefill?.destination ? { destination: String(prefill.destination) } : {}),
  }), [prefill?.purpose, prefill?.departure_place, prefill?.destination]);

  const {
    values: form,
    setValues: setForm,
    restoredAt,
    clear: clearDraft,
  } = useFormDraft<typeof initialForm>(draftKey, initialWithPrefill);

  // Date fields are stored as ISO strings in localStorage; rehydrate to Date
  // objects after restore so the date pickers render correctly.
  // Also backfill any newly added fields (e.g. `stops`) that may be missing
  // from older persisted drafts to avoid `undefined.length` crashes.
  useEffect(() => {
    setForm((prev) => {
      const next: any = { ...prev };
      let changed = false;
      for (const k of ["date", "start_date", "end_date"] as const) {
        const v = (prev as any)[k];
        if (typeof v === "string" && v) {
          const d = new Date(v);
          if (!isNaN(d.getTime())) { next[k] = d; changed = true; }
        }
      }
      if (!Array.isArray((prev as any).stops)) {
        next.stops = [];
        changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredAt]);

  // Super-admin / manager: file the request on behalf of another user or driver.
  // The selection is persisted to localStorage alongside the form draft so a
  // refresh, accidental close, or browser crash doesn't lose who the request
  // is for. Cleared on successful submit and when "Discard draft" is clicked.
  type OnBehalfOf = { id: string; name: string; email: string; type: "user" | "driver"; driverId?: string };
  const onBehalfDraftKey = draftKey ? `${draftKey}:onBehalfOf` : null;
  const [onBehalfOf, setOnBehalfOf] = useState<OnBehalfOf | null>(() => {
    if (typeof window === "undefined" || !onBehalfDraftKey) return null;
    try {
      const raw = window.localStorage.getItem(onBehalfDraftKey);
      return raw ? (JSON.parse(raw) as OnBehalfOf) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined" || !onBehalfDraftKey) return;
    try {
      if (onBehalfOf) window.localStorage.setItem(onBehalfDraftKey, JSON.stringify(onBehalfOf));
      else window.localStorage.removeItem(onBehalfDraftKey);
    } catch {
      /* quota / private mode — ignore */
    }
  }, [onBehalfOf, onBehalfDraftKey]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"type" | "schedule" | "route" | "resources" | "details">("type");

  // Mandatory rating gate — block new requests until prior completed trips are rated.
  // The DB also enforces this with a trigger; the UI gives immediate feedback.
  const { data: pendingRatings = [] } = usePendingRatings(open);
  const hasPendingRatings = pendingRatings.length > 0;

  // Default duration (in days) per request type — used to auto-derive end_date
  // dynamically from start_date so requesters don't have to compute it manually.
  // Users can still override the picker; we only fill when end_date is empty
  // OR when it's still equal to the previously-derived default.
  // Default duration (in days) per request type — used to auto-derive end_date
  // dynamically from start_date so requesters don't have to compute it manually.
  // Users can still override the picker; we only fill when end_date is empty
  // OR when it's still equal to the previously-derived default.
  // Policy: Daily=intra-day (30 min slot), Field=1 day, Project=7 days.
  const DEFAULT_DURATION_DAYS: Record<string, number> = {
    daily_operation: 0,
    nighttime_operation: 0,
    project_operation: 7,
    field_operation: 1,
    group_operation: 0,
  };

  // While impersonating, force the form to file the request as the impersonated
  // user so requester_id matches what they see in /my-requests, and approval
  // routing uses the impersonated user's role (not the super_admin's).
  useEffect(() => {
    if (!isImpersonating || !user?.id) return;
    setOnBehalfOf((prev) => {
      if (prev && prev.id === user.id) return prev;
      return {
        id: user.id,
        name: profile?.full_name || user.email || "Impersonated user",
        email: user.email || "",
        type: "user",
      };
    });
  }, [isImpersonating, user?.id, user?.email, profile?.full_name]);

  // Fetch both users and drivers for the combined picker
  const { data: orgPeople = [] } = useQuery({
    queryKey: ["vr-org-people", organizationId],
    queryFn: async () => {
      const [usersRes, driversRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organizationId!)
          .order("full_name"),
        supabase
          .from("drivers")
          .select("id, first_name, last_name, email, phone, license_number, user_id, status")
          .eq("organization_id", organizationId!)
          .order("last_name"),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (driversRes.error) throw driversRes.error;

      // Build a Set of user IDs that have a driver record (to tag them)
      const driverUserIds = new Set(
        (driversRes.data || []).filter((d: any) => d.user_id).map((d: any) => d.user_id)
      );

      const userItems = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email || "Unknown",
        email: u.email || "",
        type: "user" as const,
        isAlsoDriver: driverUserIds.has(u.id),
        driverId: (driversRes.data || []).find((d: any) => d.user_id === u.id)?.id,
        searchStr: `${u.full_name || ""} ${u.email || ""}`.toLowerCase(),
      }));

      // Drivers without linked user accounts
      const driversOnly = (driversRes.data || [])
        .filter((d: any) => !d.user_id)
        .map((d: any) => ({
          id: d.id,
          name: `${d.first_name} ${d.last_name}`.trim(),
          email: d.email || d.phone || d.license_number || "",
          type: "driver" as const,
          isAlsoDriver: true,
          driverId: d.id,
          status: d.status,
          searchStr: `${d.first_name} ${d.last_name} ${d.email || ""} ${d.license_number}`.toLowerCase(),
        }));

      return [...userItems, ...driversOnly];
    },
    enabled: !!organizationId && open && canFileOnBehalf,
  });

  const { data: pools = [] } = useQuery({
    queryKey: ["fleet-pools", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fleet_pools")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  // ── Working-hours policy (per-tenant, configurable) ───────────────────────
  // Loaded from organization_settings. Used to hard-block Project /
  // operational requests that fall outside the org's working window.
  const { data: workingHoursPolicy } = useQuery({
    queryKey: ["vr-working-hours-policy", organizationId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("organization_settings")
        .select("vr_working_days, vr_working_start_time, vr_working_end_time")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      return {
        days: (data?.vr_working_days as number[] | null) ?? [1, 2, 3, 4, 5],
        start: (data?.vr_working_start_time as string | null) ?? "08:00",
        end: (data?.vr_working_end_time as string | null) ?? "17:00",
      };
    },
    enabled: !!organizationId && open,
    staleTime: 5 * 60_000,
  });

  /**
   * Validate a date-range against the org working-hours policy. Returns the
   * first human-readable violation, or null if compliant. Pure function —
   * tested by the form's submit handler before calling the mutation.
   */
  const checkWorkingHours = (from: Date | null, to: Date | null): string | null => {
    if (!workingHoursPolicy || !from) return null;
    const { days, start, end } = workingHoursPolicy;
    const [sH, sM] = start.slice(0, 5).split(":").map(Number);
    const [eH, eM] = end.slice(0, 5).split(":").map(Number);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const winLabel = `${start.slice(0, 5)}–${end.slice(0, 5)} on ${days.map((d) => dayNames[d]).join(", ")}`;

    const points: Date[] = to ? [from, to] : [from];
    for (const p of points) {
      if (!days.includes(p.getDay())) {
        return `Working-hours policy: ${dayNames[p.getDay()]} is not an allowed working day. Allowed window: ${winLabel}.`;
      }
      const mins = p.getHours() * 60 + p.getMinutes();
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;
      if (mins < startMins || mins > endMins) {
        return `Working-hours policy: ${p.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} is outside the working window. Allowed window: ${winLabel}.`;
      }
    }
    return null;
  };

  const filteredPools = useMemo(() => {
    if (!form.pool_category) return [];
    const dbPools = pools.filter((p: any) => p.category === form.pool_category);
    if (dbPools.length > 0) return dbPools.map((p: any) => p.name);
    return POOL_HIERARCHY[form.pool_category] || [];
  }, [form.pool_category, pools]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // ── Final hardened validation + sanitization ─────────────────────────
      // We re-sanitize and Zod-parse the form right before the network call.
      // This prevents any payload that bypassed the per-field UI validators
      // (e.g. through programmatic state mutation, devtools tampering, or a
      // race with `handleSubmit`) from reaching the database. Failures throw
      // a descriptive error which surfaces in the toast onError handler.
      const sanitizedForm = sanitizeVehicleRequestForm(form as any);
      const parsed = vehicleRequestZodSchema.safeParse({
        request_type: sanitizedForm.request_type,
        purpose: sanitizedForm.purpose,
        purpose_category: (form as any).purpose_category,
        project_number: sanitizedForm.project_number,
        contact_phone: sanitizedForm.contact_phone,
        departure_place: sanitizedForm.departure_place,
        destination: sanitizedForm.destination,
        num_vehicles: form.num_vehicles,
        passengers: form.passengers,
        vehicle_type: sanitizedForm.vehicle_type,
        trip_type: sanitizedForm.trip_type,
        pool_category: sanitizedForm.pool_category,
        priority: sanitizedForm.priority,
        cargo_load: (form as any).cargo_load,
        vehicle_type_justification: (form as any).vehicle_type_justification,
      });
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        throw new Error(
          `Validation failed (${first.path.join(".") || "form"}): ${first.message}`,
        );
      }
      const safe = parsed.data;

      // The JWT identity (always the real signed-in user — super_admin while
      // impersonating). Used only as a fallback when there's no impersonation
      // override in play.
      const jwtUser = (await supabase.auth.getUser()).data.user;
      const jwtProfile = (await supabase.from("profiles").select("full_name").eq("id", jwtUser!.id).single()).data;

      // Acting identity = impersonated user when present, else JWT user.
      const actingUser = user ?? jwtUser;
      const actingProfile = profile ?? jwtProfile;

      // A manager/admin can file on behalf of someone else (manual picker OR
      // automatic impersonation override). Otherwise we file as the acting user.
      const useOnBehalf = canFileOnBehalf && !!onBehalfOf && onBehalfOf.id !== actingUser!.id;
      const requesterId = useOnBehalf ? onBehalfOf!.id : actingUser!.id;
      const requesterName = useOnBehalf
        ? onBehalfOf!.name
        : (actingProfile?.full_name || actingUser!.email || "Unknown");
      // The actual signed-in user who clicked submit (always the real JWT
      // identity — never the impersonated one). This is the audit trail.
      const filerId = realUser?.id || jwtUser!.id;
      const filerName = realProfile?.full_name || realUser?.email || jwtProfile?.full_name || jwtUser?.email || "Admin";
      const filedOnBehalfNote = useOnBehalf
        ? ` (filed by ${filerName} on behalf of ${onBehalfOf!.name}${isImpersonating ? " — via impersonation" : ""})`
        : "";

      let neededFrom: string;
      let neededUntil: string | null = null;

      const isDailyLike = safe.request_type === "daily_operation" || safe.request_type === "nighttime_operation";
      if (isDailyLike) {
        neededFrom = combineDateAndTime(form.date, form.start_time) || new Date().toISOString();
        neededUntil = combineDateAndTime(form.end_date || form.date, form.end_time) || null;
      } else {
        neededFrom = combineDateAndTime(form.start_date, form.start_date_time) || new Date().toISOString();
        neededUntil = combineDateAndTime(form.end_date, form.end_date_time) || null;
      }

      // Generate descriptive request # via DB helper (VR-{TYPE}-{YYMMDD}-{NNNN}).
      // Falls back to the legacy timestamp format if the RPC fails for any reason
      // (e.g. transient connectivity), so submissions never block on numbering.
      let generatedNumber = `VR-${Date.now().toString(36).toUpperCase()}`;
      try {
        const { data: rpcNum, error: rpcErr } = await (supabase as any).rpc(
          "generate_vehicle_request_number",
          { p_org_id: organizationId, p_request_type: safe.request_type }
        );
        if (!rpcErr && typeof rpcNum === "string" && rpcNum.length > 0) {
          generatedNumber = rpcNum;
        }
      } catch { /* keep fallback */ }

      const payload = {
        organization_id: organizationId!,
        request_number: generatedNumber,
        requester_id: requesterId,
        requester_name: requesterName,
        // Audit: who actually submitted the form (vs. who it's for).
        filed_by_user_id: filerId,
        filed_by_name: filerName,
        filed_on_behalf: useOnBehalf,
        // Below — every user-controlled field flows through `safe` (the
        // sanitized + Zod-validated payload). Lat/lng + dates remain raw
        // because they're not free-text user input.
        request_type: safe.request_type,
        purpose:
          safe.purpose +
          filedOnBehalfNote +
          (safe.contact_phone ? `\n\nContact phone: ${safe.contact_phone}` : ""),
        needed_from: neededFrom,
        needed_until: neededUntil,
        departure_place: safe.departure_place || null,
        destination: safe.destination || null,
        departure_lat: form.departure_lat,
        departure_lng: form.departure_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        num_vehicles: allowsMultipleVehicles ? safe.num_vehicles : 1,
        passengers: safe.passengers,
        vehicle_type: safe.vehicle_type || null,
        trip_type: safe.trip_type || null,
        pool_category: safe.pool_category || null,
        pool_name: sanitizedForm.pool_name || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        project_number: safe.request_type === "project_operation" ? (safe.project_number || null) : null,
        priority: safe.priority || "normal",
        // Department selection (optional, snapshot name for history readability).
        department_id: form.department_id || null,
        department_name:
          (departments.find((d) => d.id === form.department_id)?.name) || null,
        // Resource-aware request audit fields.
        purpose_category: safe.purpose_category || null,
        cargo_load: safe.cargo_load || null,
        recommended_vehicle_type: recommendation?.value || null,
        vehicle_type_justification:
          isUpgrade && safe.vehicle_type_justification?.trim()
            ? safe.vehicle_type_justification.trim()
            : null,
        status: "pending",
      };

      const { data, error } = await (supabase as any).from("vehicle_requests").insert(payload).select("id").single();
      if (error) throw error;

      // ── Persist ordered intermediate stops (waypoints) ──
      // Stored in `vehicle_request_stops` with sequence = 1..N. Skip blank rows.
      const cleanStops = (form.stops || [])
        .map((s) => ({ ...s, name: (s.name || "").trim() }))
        .filter((s) => s.name.length > 0);
      if (cleanStops.length > 0) {
        const stopRows = cleanStops.map((s, i) => ({
          vehicle_request_id: data.id,
          organization_id: organizationId!,
          sequence: i + 1,
          name: s.name.slice(0, 200),
          lat: s.lat,
          lng: s.lng,
        }));
        const { error: stopsErr } = await (supabase as any)
          .from("vehicle_request_stops")
          .insert(stopRows);
        if (stopsErr) console.error("Stops insert error:", stopsErr);
      }

      const { data: routeResult, error: routeErr } = await supabase.rpc("route_vehicle_request_approval", { p_request_id: data.id });
      if (routeErr) console.error("Approval routing error:", routeErr);

      // Send SMS to routed approver(s)
      if (routeResult && routeResult !== "auto_approved") {
        try {
          const { notifyApproverSms, getAppUrl } = await import("@/services/vehicleRequestSmsService");
          const targetRole = routeResult as string; // e.g. "operations_manager" or "org_admin"
          const { data: approvers } = await (supabase as any)
            .from("user_roles")
            .select("user_id")
            .eq("organization_id", organizationId!)
            .eq("role", targetRole)
            .limit(5);
          if (approvers?.length) {
            const durationDays = neededUntil
              ? Math.max(1, Math.ceil((new Date(neededUntil).getTime() - new Date(neededFrom).getTime()) / 86400000))
              : 1;
            for (const a of approvers) {
              const { data: approverProfile } = await supabase
                .from("profiles")
                .select("full_name, phone")
                .eq("id", a.user_id)
                .single();
              if (approverProfile?.phone) {
                await notifyApproverSms({
                  approverPhone: approverProfile.phone,
                  approverName: approverProfile.full_name || "Approver",
                  requestNumber: payload.request_number,
                  requesterName: payload.requester_name,
                  purpose: payload.purpose,
                  durationDays,
                  appUrl: getAppUrl(),
                });
              }
            }
          }
        } catch (e) {
          console.error("Approver SMS error:", e);
        }
      }

      return data;
    },
    onSuccess: (data: any) => {
      toast.success(
        canFileOnBehalf && onBehalfOf && onBehalfOf.id !== user?.id
          ? `Vehicle request submitted on behalf of ${onBehalfOf.name}`
          : "Vehicle request submitted successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onOpenChange(false);
      setForm(initialWithPrefill);
      clearDraft();
      setOnBehalfOf(null);
      onSubmitted?.({ id: data?.id });
    },
    onError: (err: any) => {
      const msg: string = err?.message ?? "Submission failed";
      // DB trigger returns "PENDING_RATINGS:N" when prior trips are unrated.
      const m = msg.match(/PENDING_RATINGS:(\d+)/);
      if (m) {
        toast.error("Rate your previous trips first", {
          description: `You have ${m[1]} completed trip${m[1] === "1" ? "" : "s"} that need a rating before you can submit a new request.`,
        });
        return;
      }
      toast.error(msg);
    },
  });

  // Centralised visibility derivation — single source of truth for which
  // sections / fields render for the current request_type. Keeps JSX free
  // of inline boolean spaghetti and makes the rules unit-testable.
  const visibility = useMemo(() => deriveVisibility(form.request_type), [form.request_type]);
  const { isNighttime, isDaily, isProject, isField, allowsMultipleVehicles } = visibility;
  useEffect(() => {
    if (!allowsMultipleVehicles && form.num_vehicles !== "1") {
      setForm((f) => ({ ...f, num_vehicles: "1" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowsMultipleVehicles]);

  // Dynamic end-date: auto-derive from start_date + operation-type default.
  // Only fills when end_date is empty so a manual override is preserved.
  useEffect(() => {
    if (isDaily) return;
    if (!form.start_date) return;
    if (form.end_date) return;
    const days = DEFAULT_DURATION_DAYS[form.request_type] ?? 0;
    const derived = new Date(form.start_date);
    derived.setDate(derived.getDate() + days);
    setForm((f) => ({ ...f, end_date: derived }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_date, form.request_type, isDaily]);

  // Professional, descriptive validation (per-field, on blur + on submit).
  const validation = useVehicleRequestValidation();
  const { getError, handleBlur, validateAll, errorCount } = validation;

  // Estimated duration (days for multi-day; hours for single-day) shown in the UI.
  const durationLabel = useMemo(() => {
    if (isDaily) {
      if (!form.date || !form.start_time || !form.end_time) return null;
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h${m ? ` ${m}m` : ""}`;
    }
    if (form.start_date && form.end_date) {
      const days = Math.max(1, Math.ceil((form.end_date.getTime() - form.start_date.getTime()) / 86_400_000) + 1);
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    return null;
  }, [isDaily, form.date, form.start_time, form.end_time, form.start_date, form.end_date]);

  // ── Resource-aware recommendation (demand-shaping) ────────────────────────
  // Recompute whenever passengers or cargo change. Stays a pure derivation
  // so the audit field `recommended_vehicle_type` always reflects what the
  // user saw at the moment they submitted.
  const recommendation = useMemo(() => {
    if (!form.cargo_load) return null;
    return recommendVehicleClass({
      passengers: parseInt(form.passengers) || 1,
      cargo: form.cargo_load as CargoLoad,
    });
  }, [form.passengers, form.cargo_load]);

  // Eligible vehicle types — driven by passengers + cargo (the previously
  // selected fields). Only types that can actually carry the requested load
  // are surfaced so users can't pick something that won't fit. Recommended
  // type floats to the top, then by cost-band rank.
  const eligibleVehicleTypes = useMemo(() => {
    const passengers = Math.max(1, parseInt(form.passengers) || 1);
    const cargoOrder = { none: 0, small: 1, medium: 2, large: 3 } as const;
    const cargoNeeded = cargoOrder[(form.cargo_load || "none") as CargoLoad] ?? 0;
    return VEHICLE_TYPES_OPTIONS
      .map((vt) => ({ vt, profile: getVehicleClassProfile(vt.value) }))
      .filter(({ profile }) => {
        if (!profile) return false;
        if (profile.costBand === "specialised") return false; // dispatcher-only
        if (profile.capacity < passengers) return false;
        if (cargoOrder[profile.cargo] < cargoNeeded) return false;
        return true;
      })
      .sort((a, b) => {
        const aRec = recommendation?.value === a.vt.value ? -1 : 0;
        const bRec = recommendation?.value === b.vt.value ? -1 : 0;
        if (aRec !== bRec) return aRec - bRec;
        return (a.profile!.rank) - (b.profile!.rank);
      });
  }, [form.passengers, form.cargo_load, recommendation?.value]);

  // Auto-fill vehicle_type with the recommendation when the user hasn't
  // touched it yet. Manual edits are preserved.
  useEffect(() => {
    if (!recommendation) return;
    if (!form.vehicle_type) {
      setForm((f) => ({ ...f, vehicle_type: recommendation.value }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendation?.value]);

  // If the previously chosen vehicle type no longer fits the updated
  // passengers/cargo combo, snap back to the recommendation so the form
  // never carries a hidden, invalid selection.
  useEffect(() => {
    if (!form.vehicle_type) return;
    const stillEligible = eligibleVehicleTypes.some((e) => e.vt.value === form.vehicle_type);
    if (!stillEligible) {
      setForm((f) => ({ ...f, vehicle_type: recommendation?.value || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleVehicleTypes, recommendation?.value]);

  // True when the user is asking for a more expensive class than recommended.
  const isUpgrade = isUpgradeOverRecommendation(form.vehicle_type, recommendation?.value);
  const chosenProfile = getVehicleClassProfile(form.vehicle_type);

  const canSubmit =
    !!form.purpose &&
    !!form.purpose_category &&
    (isDaily ? !!form.date : !!form.start_date) &&
    (!isProject || !!form.project_number?.trim()) &&
    (!isUpgrade || !!form.vehicle_type_justification?.trim()) &&
    errorCount === 0;

  const handleSubmit = () => {
    const sanitized = sanitizeVehicleRequestForm(form as any) as any;
    setForm((f) => ({ ...f, ...sanitized }));
    const result = validateAll({ ...form, ...sanitized } as any);
    if (!result.valid) {
      const firstField = Object.keys(result.errors)[0];
      const firstMsg = (result.errors as any)[firstField];
      toast.error(firstMsg || "Please fix the highlighted fields before submitting.");
      // Jump to the first tab containing an error
      const tabForField: Record<string, typeof activeTab> = {
        request_type: "type",
        date: "schedule", start_time: "schedule", end_time: "schedule",
        start_date: "schedule", end_date: "schedule", project_number: "schedule",
        departure_place: "route", destination: "route", trip_type: "route",
        num_vehicles: "resources", passengers: "resources", vehicle_type: "resources",
        priority: "resources", pool_category: "resources", pool_name: "resources",
        contact_phone: "resources",
        purpose: "details",
      };
      const target = tabForField[firstField];
      if (target) setActiveTab(target);
      return;
    }

    // Working-hours policy enforcement (Project / operational only).
    // Daily and Field requests are short-form and exempt; Project requests
    // run during business hours and are hard-blocked outside the org window.
    if (isProject) {
      const fromDate = form.start_date
        ? combineDateAndTime(form.start_date, form.start_date_time)
        : null;
      const toDate = form.end_date
        ? combineDateAndTime(form.end_date, form.end_date_time)
        : null;
      const violation = checkWorkingHours(
        fromDate ? new Date(fromDate) : null,
        toDate ? new Date(toDate) : null
      );
      if (violation) {
        toast.error(violation);
        setActiveTab("schedule");
        return;
      }
    }

    // Resource-aware demand shaping.
    if (!form.purpose_category) {
      toast.error("Select a business purpose category. Personal use of fleet vehicles is not permitted.");
      setActiveTab("details");
      return;
    }
    if (isUpgrade && !form.vehicle_type_justification?.trim()) {
      toast.error(
        `You picked ${chosenProfile?.label || "a larger vehicle"} but ${recommendation?.label} is sufficient. Please add a justification.`
      );
      setActiveTab("resources");
      return;
    }

    createMutation.mutate();
  };

  const update = <K extends keyof typeof initialForm>(key: K, val: (typeof initialForm)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  /** Small inline error renderer (only shows when field has been touched). */
  const FieldError = ({ field }: { field: Parameters<typeof getError>[0] }) => {
    const msg = getError(field);
    if (!msg) return null;
    return (
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive animate-fade-in">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{msg}</span>
      </p>
    );
  };


  const TABS = [
    { id: "type", label: "Type", icon: Sparkles, hint: "Operation" },
    { id: "schedule", label: "Schedule", icon: CalendarDays, hint: "When" },
    { id: "route", label: "Route", icon: MapPin, hint: "Where" },
    { id: "resources", label: "Resources", icon: Layers, hint: "Vehicles & Pool" },
    { id: "details", label: "Details", icon: FileText, hint: "Purpose & Submit" },
  ] as const;
  const tabIndex = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => setActiveTab(TABS[Math.min(tabIndex + 1, TABS.length - 1)].id as any);
  const goPrev = () => setActiveTab(TABS[Math.max(tabIndex - 1, 0)].id as any);

  // Per-tab completion indicators
  const tabComplete: Record<string, boolean> = {
    type: !!form.request_type,
    schedule: isDaily ? !!form.date : !!form.start_date,
    route: !!form.departure_place || !!form.destination,
    resources: !!form.num_vehicles && !!form.passengers && !!form.vehicle_type && !!form.cargo_load && (!isUpgrade || !!form.vehicle_type_justification?.trim()),
    details: !!form.purpose && !!form.purpose_category,
  };

  const HeaderInner = (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
        <Car className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Vehicle Request
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the sections below and submit — your progress auto-saves as you type.
        </p>
      </div>
      <Badge
        variant="outline"
        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 border-border bg-muted/40 text-muted-foreground font-normal"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">Auto-saved</span>
      </Badge>
    </div>
  );

  const body = (
    <>
      {embedded ? (
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent">
          {HeaderInner}
        </div>
      ) : (
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border/60 bg-card sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="sr-only">Vehicle Request</DialogTitle>
            <DialogDescription className="sr-only">
              Vehicle request form — fill in the sections and submit.
            </DialogDescription>
            {HeaderInner}
          </DialogHeader>
        </div>
      )}

      <div className={`${embedded ? "px-1" : "px-6 sm:px-8"} pt-6 pb-2 space-y-5`}>
        {/* Draft restored notice */}
        {restoredAt && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs animate-fade-in">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <History className="w-3.5 h-3.5 text-primary" />
              Draft restored from {new Date(restoredAt).toLocaleString()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => { clearDraft(); setForm(initialWithPrefill); setOnBehalfOf(null); }}
            >
              Discard draft
            </Button>
          </div>
        )}

        {/* Manager/admin: file on behalf of any user or driver */}
        {canFileOnBehalf && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-3 flex items-center gap-2 flex-wrap">
            <UserCog className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium">Request on behalf of:</span>
            {onBehalfOf ? (
              <>
                <Badge variant="secondary" className="gap-1">
                  {onBehalfOf.type === "driver" && <Car className="w-3 h-3" />}
                  {onBehalfOf.name}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">{onBehalfOf.type}</Badge>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOnBehalfOf(null)}>
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              </>
            ) : (
              <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">Select person…</Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-96" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, email, or license…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No users or drivers found.</CommandEmpty>
                      <CommandGroup heading="System Users">
                        {orgPeople.filter((p: any) => p.type === "user").map((u: any) => (
                          <CommandItem
                            key={`user-${u.id}`}
                            value={u.searchStr}
                            onSelect={() => {
                              setOnBehalfOf({ id: u.id, name: u.name, email: u.email, type: "user", driverId: u.driverId });
                              setUserPickerOpen(false);
                            }}
                            className="cursor-pointer gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm truncate">{u.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                              </div>
                              {u.isAlsoDriver && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">Driver</Badge>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {orgPeople.some((p: any) => p.type === "driver") && (
                        <CommandGroup heading="Drivers (no user account)">
                          {orgPeople.filter((p: any) => p.type === "driver").map((d: any) => (
                            <CommandItem
                              key={`driver-${d.id}`}
                              value={d.searchStr}
                              onSelect={() => {
                                setOnBehalfOf({ id: d.id, name: d.name, email: d.email, type: "driver", driverId: d.id });
                                setUserPickerOpen(false);
                              }}
                              className="cursor-pointer gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm truncate">{d.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">{d.email}</span>
                                </div>
                                <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-xs px-1.5 py-0 shrink-0 capitalize">
                                  {d.status || "active"}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {onBehalfOf ? "Approval routing will use this person's role." : "Leave empty to file as yourself."}
            </span>
          </div>
        )}

        {/* Mandatory rating gate */}
        {hasPendingRatings && <PendingRatingsBlocker className="mb-1" />}

        {/* Personal request summary — helps requesters see status of prior submissions before filing a new one */}
        <MyVehicleRequestsSummary variant="compact" />

        {/* Single-page form — sections render one after another, scroll naturally */}
        <div className="space-y-8">

          {/* TYPE SECTION */}
          <section className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">1</span>
              <h3 className="text-base font-semibold text-foreground">Operation Type</h3>
            </div>
            <Label className="text-foreground font-medium text-sm">Vehicle Request Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { v: "daily_operation", title: "Daily Operation", desc: "Single-day trip with start & end time", icon: Clock },
                { v: "nighttime_operation", title: "Nighttime Operation", desc: "Night-shift trip (02:00 – 12:00 window)", icon: Moon },
                { v: "project_operation", title: "Project Operation", desc: "Multi-day, project-coded assignment", icon: Layers },
                { v: "field_operation", title: "Field Operation", desc: "Extended off-base or field deployment", icon: Route },
                { v: "group_operation", title: "Group Operation", desc: "Shared trip for a group of passengers", icon: Users },
              ].map(({ v, title, desc, icon: Icon }) => {
                const active = form.request_type === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update("request_type", v)}
                    className={`group relative text-left rounded-xl border p-4 transition-all ${
                      active
                        ? "border-primary/60 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-sm text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</div>
                    {active && (
                      <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SCHEDULE SECTION */}
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">2</span>
              <h3 className="text-base font-semibold text-foreground">Schedule</h3>
            </div>
            {/* Working-hours policy banner — Project / operational only */}
            {isProject && workingHoursPolicy && (() => {
              const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const days = workingHoursPolicy.days.map((d) => dayNames[d]).join(", ");
              return (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Working-hours policy:</span>{" "}
                    Operational requests must run between{" "}
                    <span className="font-medium text-foreground">
                      {workingHoursPolicy.start.slice(0, 5)}–{workingHoursPolicy.end.slice(0, 5)}
                    </span>{" "}
                    on <span className="font-medium text-foreground">{days}</span>.
                    Outside these hours? Use Daily or Field operations instead.
                  </span>
                </div>
              );
            })()}
            {isNighttime && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex items-start gap-2">
                <Moon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">Nighttime window:</span>{" "}
                  Start and end times must be between{" "}
                  <span className="font-medium text-foreground">02:00 and 12:00</span>.
                </span>
              </div>
            )}
            {isDaily ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <DateTimePicker label="Date" date={form.date} onDateChange={d => { update("date", d); handleBlur("date", d, form as any); handleBlur("start_time", form.start_time, { ...form, date: d } as any); }} required minDate={new Date()} hideTime />
                  <FieldError field="date" />
                </div>
                <div>
                  <Label className="text-primary font-medium">Start Time <span className="text-destructive">*</span></Label>
                  <TimePicker
                    value={form.start_time}
                    onChange={v => update("start_time", v)}
                    onBlur={() => handleBlur("start_time", form.start_time, form as any)}
                    ariaInvalid={!!getError("start_time")}
                  />
                  <FieldError field="start_time" />
                </div>
                <div>
                  <Label className="text-primary font-medium">End Time <span className="text-destructive">*</span></Label>
                  <TimePicker
                    value={form.end_time}
                    onChange={v => update("end_time", v)}
                    onBlur={() => handleBlur("end_time", form.end_time, form as any)}
                    ariaInvalid={!!getError("end_time")}
                  />
                  <FieldError field="end_time" />
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${isProject ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                <div>
                  <DateTimePicker label="Start Date" date={form.start_date} onDateChange={d => { update("start_date", d); handleBlur("start_date", d, form as any); }} required minDate={new Date()} hideTime />
                  <FieldError field="start_date" />
                </div>
                <div>
                  <DateTimePicker label="End Date" date={form.end_date} onDateChange={d => { update("end_date", d); handleBlur("end_date", d, form as any); }} required={isProject} minDate={form.start_date} hideTime />
                  <FieldError field="end_date" />
                </div>
                {visibility.showProjectNumber && (
                  <VRField
                    id="vr-project-number"
                    label="Project Number"
                    required
                    error={getError("project_number")}
                    tooltip="Project code this trip is charged to (e.g. PRJ-2026-001). Letters, digits and dashes."
                  >
                    <Input
                      value={form.project_number}
                      onChange={e => update("project_number", e.target.value)}
                      onBlur={e => handleBlur("project_number", e.target.value, form as any)}
                      placeholder="e.g. PRJ-2026-001"
                      className="h-10"
                    />
                  </VRField>
                )}
              </div>
            )}


            {/* Live duration summary */}
            {durationLabel && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Estimated duration:</span>
                <Badge variant="secondary" className="font-semibold">{durationLabel}</Badge>
              </div>
            )}

            {/* Per-field errors are rendered inline below their inputs. */}

            {isField && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-primary">Field Operation Note</p>
                <p className="mt-0.5">Field operations may require special vehicle types and extended durations. Ensure GPS tracking is enabled for the duration of the trip.</p>
              </div>
            )}
          </section>

          {/* ROUTE SECTION */}
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">3</span>
              <h3 className="text-base font-semibold text-foreground">Route</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocationPickerField
                label="Departure Place"
                value={form.departure_place}
                onChange={v => update("departure_place", v)}
                onCoordsChange={(lat, lng) => { update("departure_lat", lat); update("departure_lng", lng); }}
                placeholder="Select or type departure"
                iconColor="text-green-500"
              />
              <LocationPickerField
                label="Final Destination"
                value={form.destination}
                onChange={v => update("destination", v)}
                onCoordsChange={(lat, lng) => { update("destination_lat", lat); update("destination_lng", lng); }}
                placeholder="Select or type final destination"
                iconColor="text-red-500"
              />
            </div>
            {(form.departure_lat != null || form.destination_lat != null) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.departure_lat != null && form.departure_lng != null ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                    <div className="font-medium text-foreground text-sm flex items-center gap-1"><MapPin className="w-3 h-3 text-green-500" /> {form.departure_place || "Departure"}</div>
                    <div>Lat: {form.departure_lat.toFixed(6)} &nbsp;|&nbsp; Lng: {form.departure_lng.toFixed(6)}</div>
                  </div>
                ) : <div />}
                {form.destination_lat != null && form.destination_lng != null ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                    <div className="font-medium text-foreground text-sm flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500" /> {form.destination || "Destination"}</div>
                    <div>Lat: {form.destination_lat.toFixed(6)} &nbsp;|&nbsp; Lng: {form.destination_lng.toFixed(6)}</div>
                  </div>
                ) : <div />}
              </div>
            )}

            {/* ── Ordered waypoints (intermediate stops between Departure and Final Destination) ── */}
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-primary font-medium flex items-center gap-1">
                    <Route className="w-3.5 h-3.5" /> Intermediate Stops
                    <FieldHint>
                      Add ordered waypoints between Departure and Final Destination. Driver will visit them in this order.
                    </FieldHint>
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update("stops", [...form.stops, { name: "", lat: null, lng: null }] as any)
                  }
                  disabled={form.stops.length >= 10}
                >
                  + Add Stop
                </Button>
              </div>
              {form.stops.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No intermediate stops. Trip goes directly from Departure to Final Destination.</p>
              )}
              {form.stops.map((stop, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-end gap-2 rounded-md border border-border bg-background/60 p-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <LocationPickerField
                    label={`Stop ${idx + 1}`}
                    value={stop.name}
                    onChange={(v) => {
                      const next = [...form.stops];
                      next[idx] = { ...next[idx], name: v };
                      update("stops", next as any);
                    }}
                    onCoordsChange={(lat, lng) => {
                      const next = [...form.stops];
                      next[idx] = { ...next[idx], lat, lng };
                      update("stops", next as any);
                    }}
                    placeholder={`Select or type stop ${idx + 1}`}
                    iconColor="text-amber-500"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Move up"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = [...form.stops];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      update("stops", next as any);
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Move down"
                    disabled={idx === form.stops.length - 1}
                    onClick={() => {
                      const next = [...form.stops];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      update("stops", next as any);
                    }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Remove stop"
                    onClick={() => {
                      const next = form.stops.filter((_, i) => i !== idx);
                      update("stops", next as any);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Route className="w-3.5 h-3.5" /> Trip Type</Label>
              <Select value={form.trip_type} onValueChange={v => update("trip_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Trip Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way Trip</SelectItem>
                  <SelectItem value="round_trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* RESOURCES SECTION */}
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">4</span>
              <h3 className="text-base font-semibold text-foreground">Vehicle & Pool</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VRField
                id="vr-num-vehicles"
                label={
                  <span className="inline-flex items-center gap-1.5">
                    No. Of Vehicles
                    {!allowsMultipleVehicles && (
                      <Badge variant="outline" className="text-xs py-0 px-1.5">Locked at 1</Badge>
                    )}
                  </span>
                }
                icon={Car}
                error={getError("num_vehicles")}
                tooltip={
                  allowsMultipleVehicles
                    ? "Project Operations support a fleet — request as many vehicles as needed."
                    : "Daily & Field operations are limited to one vehicle. Switch to Project Operation to request more."
                }
              >
                <Input
                  type="number"
                  min={1}
                  max={allowsMultipleVehicles ? 50 : 1}
                  value={allowsMultipleVehicles ? form.num_vehicles : "1"}
                  onChange={e => update("num_vehicles", e.target.value)}
                  onBlur={e => handleBlur("num_vehicles", e.target.value, form as any)}
                  disabled={!allowsMultipleVehicles}
                  className="h-10"
                />
              </VRField>
              <VRField
                id="vr-passengers"
                label="No. Of Passengers"
                icon={Users}
                error={getError("passengers")}
                tooltip="Enter passengers excluding the driver (i.e. seats needed minus 1)."
              >
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.passengers}
                  onChange={e => update("passengers", e.target.value)}
                  onBlur={e => handleBlur("passengers", e.target.value, form as any)}
                  className="h-10"
                />
              </VRField>
              <div>
                <Label className="text-primary font-medium flex items-center gap-1">
                  Cargo / Equipment <span className="text-destructive">*</span>
                  <FieldHint>Required — helps recommend the smallest sufficient vehicle and reserve cargo capacity.</FieldHint>
                </Label>
                <Select
                  value={form.cargo_load}
                  onValueChange={(v) => update("cargo_load", v as CargoLoad)}
                >
                  <SelectTrigger
                    className="h-10"
                    aria-invalid={!form.cargo_load}
                  >
                    <SelectValue placeholder="Select cargo size (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGO_LOAD_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{c.label}</span>
                          <span className="text-xs text-muted-foreground">{c.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.cargo_load && (
                  <p className="text-xs text-destructive mt-1">
                    Pick the cargo size — choose "None" if you're only carrying passengers.
                  </p>
                )}
              </div>

              {/* Resource-aware recommendation banner — pure derivation from passengers + cargo */}
              {recommendation && (
                <div className="md:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">Recommended for you:</span>
                    <Badge className="gap-1.5">
                      <Car className="w-3 h-3" /> {recommendation.label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${COST_BAND_TONE[recommendation.costBand]}`}>
                      {COST_BAND_LABELS[recommendation.costBand]}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Fits {recommendation.capacity} people · {form.cargo_load} cargo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Picking a larger class than needed wastes fleet capacity and costs more. You can override below if there's a real reason — please justify it for the approver.
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <Label className="text-primary font-medium flex items-center gap-2">
                  Vehicle Type
                  {recommendation && form.vehicle_type === recommendation.value && (
                    <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Matches recommendation
                    </Badge>
                  )}
                  {isUpgrade && (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Upgrade — justification required
                    </Badge>
                  )}
                </Label>
                <Select value={form.vehicle_type} onValueChange={v => update("vehicle_type", v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select Vehicle Type" /></SelectTrigger>
                  <SelectContent>
                    {eligibleVehicleTypes.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No vehicle class fits {form.passengers} passenger(s) with {form.cargo_load} cargo. Adjust the passenger count or cargo size, or contact dispatch.
                      </div>
                    ) : (
                      eligibleVehicleTypes.map(({ vt, profile }) => {
                        const isRec = recommendation?.value === vt.value;
                        return (
                          <SelectItem key={vt.value} value={vt.value}>
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-sm">{vt.label}</span>
                              {profile && (
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${COST_BAND_TONE[profile.costBand]}`}>
                                  {COST_BAND_LABELS[profile.costBand]}
                                </Badge>
                              )}
                              {isRec && <span className="text-xs text-primary ml-auto">★ recommended</span>}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {chosenProfile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Capacity: {chosenProfile.capacity} · Cargo: {chosenProfile.cargo} · Tier: {COST_BAND_LABELS[chosenProfile.costBand]}
                  </p>
                )}
              </div>

              {/* Justification — only shown when over-spec'd */}
              {isUpgrade && (
                <div className="md:col-span-2 animate-fade-in">
                  <Label className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    Why is {chosenProfile?.label} needed instead of {recommendation?.label}? <span className="text-destructive">*</span>
                    <FieldHint tone="warning">
                      Visible to your approver. Be specific — generic reasons may be rejected.
                    </FieldHint>
                  </Label>
                  <Textarea
                    value={form.vehicle_type_justification}
                    onChange={(e) => update("vehicle_type_justification", e.target.value)}
                    placeholder="e.g. Carrying bulky equipment that doesn't fit a sedan, or transporting senior leadership delegation."
                    rows={2}
                    maxLength={500}
                  />
                </div>
              )}
              <div>
                <Label className="text-primary font-medium">Priority</Label>
                <Select value={form.priority} onValueChange={v => update("priority", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low — flexible timing</SelectItem>
                    <SelectItem value="normal">🔵 Normal — standard priority</SelectItem>
                    <SelectItem value="high">🟠 High — time sensitive</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent — immediate dispatch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-primary font-medium flex items-center gap-1">
                  Assigned Pool
                  <FieldHint>Operational pool the trip will be served from.</FieldHint>
                </Label>
                <Select value={form.pool_name} onValueChange={v => {
                  // Derive a category bucket so downstream filters/reports keep working.
                  const found = ASSIGNED_POOLS.find(p => p.value === v);
                  const cat = found?.group === "Corporate Pools" ? "corporate"
                            : found?.group === "Regional Pools" ? "region"
                            : "zone";
                  update("pool_name", v);
                  update("pool_category", cat);
                }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select Assigned Pool" /></SelectTrigger>
                  <SelectContent>
                    {["Corporate Pools", "Regional Pools", "Other"].map(group => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {ASSIGNED_POOLS.filter(p => p.group === group).map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <VRField
                  id="vr-contact-phone"
                  label="Contact Phone (during trip)"
                  error={getError("contact_phone")}
                  tooltip="Optional. Helps dispatch reach the requester quickly if plans change."
                >
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.contact_phone}
                    onChange={e => update("contact_phone", e.target.value)}
                    onBlur={e => handleBlur("contact_phone", e.target.value, form as any)}
                    placeholder="+251 9X XXX XXXX — reachable while the trip is active"
                    className="h-10"
                  />
                </VRField>
              </div>
            </div>
          </section>

          {/* DETAILS SECTION */}
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-1 border-b border-border/60">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">5</span>
              <h3 className="text-base font-semibold text-foreground">Purpose & Submit</h3>
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1">
                Business Purpose Category <span className="text-destructive">*</span>
                <FieldHint>
                  Fleet vehicles are for business use only. Personal or family trips are not permitted.
                </FieldHint>
              </Label>
              <Select value={form.purpose_category} onValueChange={(v) => update("purpose_category", v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select the business purpose…" />
                </SelectTrigger>
                <SelectContent className="max-h-[420px]">
                  {BUSINESS_PURPOSE_GROUPS.map((g) => {
                    const items = BUSINESS_PURPOSE_CATEGORIES.filter(
                      (c) => c.group === g.id && !c.hidden,
                    );
                    if (items.length === 0) return null;
                    return (
                      <SelectGroup key={g.id}>
                        <SelectLabel
                          className={
                            g.restricted
                              ? "text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wide"
                              : "text-xs uppercase tracking-wide text-muted-foreground"
                          }
                        >
                          {g.label}
                        </SelectLabel>
                        {items.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex flex-col items-start">
                              <span className="text-sm">{c.label}</span>
                              <span className="text-xs text-muted-foreground">{c.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
              {(() => {
                const selected = BUSINESS_PURPOSE_CATEGORIES.find(
                  (c) => c.value === form.purpose_category,
                );
                if (selected?.group === "social") {
                  return (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Restricted use — requires additional approval and clear business justification in the description below.
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1">
                Department / Division
                <FieldHint>
                  The unit this trip is charged to / belongs to. Helps approval routing & reporting.
                </FieldHint>
              </Label>
              <Select
                value={form.department_id || "__none__"}
                onValueChange={(v) => update("department_id", v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No department —</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code ? `${d.code} · ${d.name}` : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <VRField
              id="vr-purpose"
              label="Trip Description"
              icon={FileText}
              required
              error={getError("purpose")}
              filled={(form.purpose?.length || 0) >= 10}
              hint={
                <span className={(form.purpose?.length || 0) >= 1000 ? "text-destructive font-medium" : undefined}>
                  {form.purpose?.length || 0}/1000 characters
                </span>
              }
            >
              <Textarea
                value={form.purpose}
                onChange={e => update("purpose", e.target.value.slice(0, 1000))}
                onBlur={e => handleBlur("purpose", e.target.value, form as any)}
                placeholder="Describe the purpose of this trip — what, where, and why (min 10 characters)…"
                rows={4}
                maxLength={1000}
              />
            </VRField>
            <div className="rounded-lg border border-border bg-gradient-to-br from-muted/50 to-muted/20 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Approval Routing</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">≤15 days</span> → Immediate Manager</div>
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">&gt;15 days</span> → Director</div>
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">Managers+</span> → Auto-approved</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {(() => {
        const FooterInner = (
          <div className="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setForm(buildInitialForm()); validation.reset(); }}
              className="text-muted-foreground self-start sm:self-auto h-8 px-2"
            >
              Clear
            </Button>
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit || createMutation.isPending || hasPendingRatings}
                title={hasPendingRatings ? "Rate your previous trips before submitting" : undefined}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        );
        return embedded ? (
          <div className="pt-4 border-t border-border/60 mt-4">{FooterInner}</div>
        ) : (
          <DialogFooter className="-mx-6 -mb-6 px-6 py-3.5 mt-6 bg-muted/30 border-t border-border/60 sm:justify-between">
            {FooterInner}
          </DialogFooter>
        );
      })()}

    </>
  );

  // Driver-only users get a friendly explainer instead of the form.
  const blockedBody = (
    <div className="space-y-3 py-4 text-center">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          Vehicle Requests Are Not Available
        </DialogTitle>
        <DialogDescription className="pt-2">
          Drivers cannot initiate vehicle requests. Vehicle requests are filed by
          end-users, supervisors, dispatchers, and managers — who then assign
          you to the trip after approval.
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Please ask your supervisor or dispatcher to file a request on your behalf.
      </p>
      {!embedded && (
        <DialogFooter className="sm:justify-center pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      )}
    </div>
  );

  if (embedded) {
    return <div className="space-y-4">{isDriverOnly ? blockedBody : body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto p-0 gap-0">
        {isDriverOnly ? blockedBody : body}
      </DialogContent>
    </Dialog>
  );
};
