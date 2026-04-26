import { useState, useMemo, useEffect, useRef } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useAuth } from "@/hooks/useAuth";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Users, Car, Route, UserCog, X, MapPin, Layers, FileText, Sparkles, CalendarDays, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Moon, Building2, Globe2, Bike, Package } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { FieldHint } from "@/components/ui/field-hint";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DateTimePicker, combineDateAndTime } from "@/components/ui/date-time-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import { VEHICLE_TYPES_OPTIONS, ASSIGNED_POOLS, ASSIGNED_LOCATIONS } from "@/components/fleet/formConstants";
import { AlertCircle } from "lucide-react";
import { useVehicleRequestValidation } from "./useVehicleRequestValidation";
import { sanitizeVehicleRequestForm, vehicleRequestZodSchema, validateVehicleRequestForm } from "./vehicleRequestValidation";
import { VRField } from "./VRField";
import { DateTimeRangeField } from "./DateTimeRangeField";
import { DateRangeField } from "./DateRangeField";
import { RouteField } from "./RouteField";
import { deriveVisibility } from "./visibility";
import { RouteMapPreview } from "./RouteMapPreview";
import { SharedRideMatchSuggestions } from "./SharedRideMatchSuggestions";
import { useJoinSharedRide, type SharedRideMatch } from "@/hooks/useSharedRides";

import { PendingRatingsBlocker } from "@/components/ratings/PendingRatingsBlocker";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { useCan } from "@/hooks/useCan";

import { useDepartments } from "@/hooks/useDepartments";
import { usePoolMembership } from "@/hooks/usePoolMembership";
import {
  recommendVehicleClass,
  isUpgradeOverRecommendation,
  getVehicleClassProfile,
  VEHICLE_CLASS_CATALOG,
  isPassengerVehicleType,
  NON_PASSENGER_SENTINEL,
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
 * Pool Category metadata — mirrors the visual chip used in the Vehicle
 * Registration form (BasicInfoTabs) so requesters see the same icon + tone
 * for Corporate / Zone / Region across both flows.
 *
 * Keys map to the lower-case `pool_category` we persist on `vehicle_requests`.
 */
const POOL_CATEGORY_META: Record<
  "corporate" | "zone" | "region",
  { label: string; icon: typeof Building2; tone: string; desc: string; locationGroup: "Corporate" | "Zone" | "Region" }
> = {
  corporate: { label: "Corporate", icon: Building2, tone: "text-blue-500 bg-blue-500/10 ring-blue-500/20",     desc: "Head office assets",  locationGroup: "Corporate" },
  zone:      { label: "Zone",      icon: Layers,    tone: "text-amber-500 bg-amber-500/10 ring-amber-500/20",   desc: "Zonal pool",          locationGroup: "Zone" },
  region:    { label: "Region",    icon: Globe2,    tone: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20", desc: "Regional pool",   locationGroup: "Region" },
};

function PoolCategoryChip({ value, compact = false }: { value: string; compact?: boolean }) {
  const meta = POOL_CATEGORY_META[value as keyof typeof POOL_CATEGORY_META];
  if (!meta) return <span>{value}</span>;
  const Icon = meta.icon;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${meta.tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex flex-col min-w-0 leading-tight">
        <span className="text-sm font-medium truncate">{meta.label}</span>
        {!compact && <span className="text-[10px] text-muted-foreground truncate">{meta.desc}</span>}
      </span>
    </span>
  );
}

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

const buildInitialForm = () => {
  // Prefill date + start time with the machine's current values so users land
  // on a ready-to-submit form. End time stays blank so they choose when the
  // trip ends. Times are HH:MM strings to match the TimePicker contract.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    request_type: "" as string,
    date: today as Date | undefined,
    start_time: nowHHMM,
    end_time: "",
    start_date: today as Date | undefined,
    start_date_time: nowHHMM,
    end_date: undefined as Date | undefined,
    end_date_time: "",
    departure_place: "",
    destination: "",
    departure_lat: null as number | null,
    departure_lng: null as number | null,
    destination_lat: null as number | null,
    destination_lng: null as number | null,
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
    priority: "normal" as string,
    contact_phone: "",
    purpose_category: "" as string,
    cargo_load: "" as CargoLoad | "",
    cargo_weight_kg: "" as string,
    cargo_description: "" as string,
    vehicle_type_justification: "" as string,
    night_request_subcategory: "" as "" | "night_shift" | "emergency",
    /** What the requester explicitly selected (preserved verbatim). */
    requested_request_type: "" as string,
  };
};

// NOTE: We intentionally do NOT compute `initialForm` at module-load time
// because the form's default Date + Start Time should reflect the *current*
// machine clock when the requester opens the form — not whenever the JS
// bundle was first parsed (which can be hours or days earlier on a long
// running tab). The form computes a fresh default per-mount inside the
// component body via `useMemo`. The exported type below preserves the
// shape for `useFormDraft<typeof initialForm>` consumers.
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
  // Pool memberships drive which Specific-Pool entries the requester can pick.
  // Org-wide roles (super_admin, org_admin, fleet_owner/manager, ops_manager,
  // dispatcher, auditor) bypass this filter and see every pool. Everyone else
  // sees ONLY pools they're assigned to via `pool_memberships`.
  const {
    poolCodes: userPoolCodes,
    unrestricted: poolUnrestricted,
    hasAnyMembership,
    loading: poolMembershipLoading,
  } = usePoolMembership();

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

  // "File on behalf of" is available to ALL authenticated users so anyone can
  // submit a request for a colleague who lacks system access. Every such
  // submission is structurally audited via filed_by_user_id / filed_on_behalf.
  const canFileOnBehalf = !!user;

  // Persist in-progress form per (user, source) so progress isn't lost on
  // accidental close, refresh, navigation, or browser crash.
  // Versioned to invalidate stale drafts created before the AM/PM picker fix,
  // which could restore 04:03 when the requester meant 4:03 PM.
  const legacyDraftKey = user?.id ? `vehicle-request:${user.id}:${source ?? "default"}` : null;
  const draftKey = user?.id ? `vehicle-request:v2:${user.id}:${source ?? "default"}` : null;
  const initialWithPrefill = useMemo(() => ({
    // Recompute defaults each time the dialog opens so the Date field
    // reflects the *current* machine clock — not whenever the JS bundle
    // first parsed `initialForm`. Without this, a long-lived tab can
    // present yesterday's date as today's default.
    ...buildInitialForm(),
    ...(prefill?.purpose ? { purpose: String(prefill.purpose) } : {}),
    ...(prefill?.departure_place ? { departure_place: String(prefill.departure_place) } : {}),
    ...(prefill?.destination ? { destination: String(prefill.destination) } : {}),
  // `open` is in the deps so a re-open after midnight gets the correct date.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [prefill?.purpose, prefill?.departure_place, prefill?.destination, open]);

  useEffect(() => {
    if (typeof window === "undefined" || !legacyDraftKey) return;
    try {
      window.localStorage.removeItem(`lov-form-draft:${legacyDraftKey}`);
      window.localStorage.removeItem(`${legacyDraftKey}:onBehalfOf`);
    } catch {
      /* ignore storage issues */
    }
  }, [legacyDraftKey]);

  const {
    values: form,
    setValues: setForm,
    restoredAt,
    savedAt,
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

  // Track whether the user has manually edited the date / start time so the
  // auto-sync ticker doesn't fight their input. Reset every time the dialog
  // reopens so a fresh form re-engages live sync.
  const userTouchedDateRef = useRef(false);
  const userTouchedStartTimeRef = useRef(false);
  // Tracks whether the user has manually overridden the auto-recommended
  // vehicle type. While false, the form keeps `vehicle_type` in sync with
  // the recommendation as passengers/cargo change (so reducing passengers
  // from 30 → 4 downgrades bus → sedan instead of "sticking" on the bus).
  const userPickedVehicleTypeRef = useRef(false);


  // Auto-sync Date and Start Time to the machine's current clock whenever the
  // form is opened, and keep them ticking live (every 30s) until the user
  // edits any schedule field. End time stays under user control.
  //
  // IMPORTANT: once the user has supplied an end_time (i.e. actively configured
  // the trip window) we MUST stop bumping start_time forward — otherwise the
  // ticking clock can shove start_time past end_time and the validator will
  // suddenly start screaming "start time is in the past" / "end before start"
  // even though the user has already filled both fields correctly.
  useEffect(() => {
    if (!open) return;
    userTouchedDateRef.current = false;
    userTouchedStartTimeRef.current = false;

    const sync = () => {
      setForm((prev) => {
        // Only freeze auto-sync once the USER has explicitly touched the
        // start time. Auto-picked request_type / default end_time should NOT
        // freeze the live clock — otherwise reopening the form leaves a stale
        // start time from a previous session.
        if (userTouchedStartTimeRef.current) return prev;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const next: any = { ...prev };
        let changed = false;
        if (!userTouchedDateRef.current) {
          const prevDate = prev.date instanceof Date ? prev.date : (prev.date ? new Date(prev.date as any) : null);
          if (!prevDate || prevDate.getTime() !== today.getTime()) {
            next.date = today;
            changed = true;
          }
          const prevStart = prev.start_date instanceof Date ? prev.start_date : (prev.start_date ? new Date(prev.start_date as any) : null);
          if (!prevStart || prevStart.getTime() !== today.getTime()) {
            next.start_date = today;
            changed = true;
          }
        }
        if (prev.start_time !== nowHHMM) {
          next.start_time = nowHHMM;
          if (!prev.start_date_time) next.start_date_time = nowHHMM;
          changed = true;
        }
        return changed ? next : prev;
      });
    };

    sync();
    const interval = setInterval(sync, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


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
  const [tripTypeTouched, setTripTypeTouched] = useState(false);
  // Confirmation dialog gating — Submit clicks now go through an "Are you sure?"
  // step so users don't accidentally fire off a request mid-edit.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<SharedRideMatch | null>(null);
  const joinRide = useJoinSharedRide();
  const fieldAnchors = useRef<Partial<Record<"date" | "start_time" | "end_time" | "start_date" | "end_date" | "project_number", HTMLDivElement | null>>>({});

  // Mandatory rating gate — block new requests until prior completed trips are rated.
  // The DB also enforces this with a trigger; the UI gives immediate feedback.
  // Roles granted `vehicle_requests.bypass_rating_gate` on the RBAC matrix
  // (super admins, org admins, fleet managers by default) skip this gate
  // entirely so administrative users are never blocked from filing requests.
  //
  // IMPORTANT: while a super_admin is impersonating another user, `useCan` and
  // `usePendingRatings` both resolve against the impersonated identity — which
  // means the admin would lose their bypass and could be blocked by the
  // impersonated user's pending ratings. The real signed-in admin is always
  // the one actually clicking submit, so the gate must respect their bypass.
  const { allowed: canBypassRatingGateAsActor } = useCan("vehicle_requests", "bypass_rating_gate");
  const canBypassRatingGate = canBypassRatingGateAsActor || isRealSuperAdmin;
  const { data: pendingRatings = [] } = usePendingRatings(open && !canBypassRatingGate);
  const hasPendingRatings = !canBypassRatingGate && pendingRatings.length > 0;

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
    messenger_service: 0,
    delivery_operation: 0, // legacy alias — kept so old drafts still resolve
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

  // Effective requester id — when filing on behalf of someone, their pool
  // membership drives the default Pool Category / Specific Pool, not the
  // filer's. Otherwise we fall back to the signed-in user.
  const effectiveRequesterId = onBehalfOf?.id || user?.id || null;

  // Pool memberships of the effective requester. Used to auto-fill the
  // Pool Category + Specific Pool fields so users don't have to pick what
  // their own assignment already implies.
  const { data: requesterPoolCodes = [] } = useQuery({
    queryKey: ["vr-requester-pools", organizationId, effectiveRequesterId],
    queryFn: async () => {
      if (!organizationId || !effectiveRequesterId) return [] as string[];
      const { data, error } = await (supabase as any)
        .from("pool_memberships")
        .select("pool_code")
        .eq("user_id", effectiveRequesterId)
        .eq("organization_id", organizationId);
      if (error) return [] as string[];
      return Array.from(new Set(((data as any[]) || []).map((r) => r.pool_code).filter(Boolean)));
    },
    enabled: !!organizationId && !!effectiveRequesterId && open,
    staleTime: 60_000,
  });

  // Track whether the user has manually touched the pool fields. Once they
  // override, auto-fill stops so we never clobber their explicit choice.
  const userTouchedPoolRef = useRef(false);

  // Auto-fill Pool Category + Specific Pool from the requester's membership.
  // Rules:
  //   • Only fill when both fields are empty AND the user hasn't manually
  //     touched the pool selectors.
  //   • If the requester belongs to exactly one pool, fill both category and
  //     specific pool. If they belong to multiple, fill only the category
  //     when all memberships share one — leaving the specific pool for the
  //     user to disambiguate.
  useEffect(() => {
    if (!open) return;
    if (userTouchedPoolRef.current) return;
    if (form.pool_category || form.pool_name) return;
    if (!requesterPoolCodes.length) return;

    // Map each pool_code to its category via POOL_HIERARCHY.
    const codeToCategory = new Map<string, string>();
    for (const [cat, codes] of Object.entries(POOL_HIERARCHY)) {
      for (const c of codes) codeToCategory.set(c, cat);
    }

    const matched = requesterPoolCodes
      .map((c) => ({ code: c, category: codeToCategory.get(c) }))
      .filter((m) => !!m.category) as { code: string; category: string }[];

    if (!matched.length) return;

    const categories = Array.from(new Set(matched.map((m) => m.category)));
    if (matched.length === 1) {
      setForm((prev) =>
        prev.pool_category || prev.pool_name
          ? prev
          : { ...prev, pool_category: matched[0].category, pool_name: matched[0].code },
      );
    } else if (categories.length === 1) {
      setForm((prev) => (prev.pool_category ? prev : { ...prev, pool_category: categories[0] }));
    }
  }, [open, requesterPoolCodes, form.pool_category, form.pool_name]);

  // Reset the manual-touch flag whenever the dialog re-opens or the effective
  // requester changes (e.g. user switches "on behalf of"), so a fresh session
  // always re-evaluates the auto-fill.
  useEffect(() => {
    userTouchedPoolRef.current = false;
  }, [open, effectiveRequesterId]);

  // ── Contact phone auto-fill ──────────────────────────────────────────────
  // Fetch the effective requester's phone from `profiles` (falling back to
  // `drivers.phone` for driver-type "on behalf of" requesters) so the Contact
  // Phone field pre-populates without manual entry. Same manual-override
  // protection as the pool fields: once the user types a phone, we stop
  // overwriting it.
  const userTouchedContactPhoneRef = useRef(false);
  const { data: requesterPhone } = useQuery({
    queryKey: ["vr-requester-phone", effectiveRequesterId, onBehalfOf?.driverId ?? null],
    queryFn: async () => {
      if (!effectiveRequesterId) return "";
      // 1) Profile phone is the canonical source of truth for any user.
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("phone")
        .eq("id", effectiveRequesterId)
        .maybeSingle();
      const profilePhone = (profile as any)?.phone?.trim?.() || "";
      if (profilePhone) return profilePhone;
      // 2) For driver-type on-behalf-of requesters, fall back to drivers.phone.
      if (onBehalfOf?.type === "driver" && onBehalfOf?.driverId) {
        const { data: drv } = await (supabase as any)
          .from("drivers")
          .select("phone")
          .eq("id", onBehalfOf.driverId)
          .maybeSingle();
        const driverPhone = ((drv as any)?.phone?.trim?.() || "") as string;
        if (driverPhone) return driverPhone;
      }
      // 3) Final fallback: HR/employees record linked by user_id.
      const { data: emp } = await (supabase as any)
        .from("employees")
        .select("phone")
        .eq("user_id", effectiveRequesterId)
        .maybeSingle();
      return (((emp as any)?.phone?.trim?.() || "") as string);
    },
    enabled: !!effectiveRequesterId && open,
    staleTime: 60_000,
  });

  // Auto-fill Contact Phone when we have a value AND the user hasn't typed
  // anything yet. Re-runs whenever the dialog opens or the requester changes.
  useEffect(() => {
    if (!open) return;
    if (userTouchedContactPhoneRef.current) return;
    if (!requesterPhone) return;
    setForm((prev) =>
      prev.contact_phone?.trim() ? prev : { ...prev, contact_phone: requesterPhone },
    );
  }, [open, requesterPhone]);

  // Reset the contact-phone touch flag on dialog open / requester change so
  // the auto-fill re-evaluates for the new session.
  useEffect(() => {
    userTouchedContactPhoneRef.current = false;
  }, [open, effectiveRequesterId]);

  // Vehicles that physically live in the chosen Specific Pool. Drives:
  //  • the upper cap on "No. of Vehicles" (can't book more than exist)
  //  • the eligibility filter on "Vehicle Type" (only types present in pool)
  // Falls back gracefully when no pool is chosen yet (returns []).
  const { data: poolVehicles = [] } = useQuery({
    queryKey: ["pool-vehicles", organizationId, form.pool_name],
    queryFn: async () => {
      if (!form.pool_name) return [];
      const { data, error } = await (supabase as any)
        .from("vehicles")
        .select("id, vehicle_type, status")
        .eq("organization_id", organizationId!)
        .eq("specific_pool", form.pool_name);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && open && !!form.pool_name,
    staleTime: 60_000,
  });

  // Normalise free-text vehicle_type strings ("Double Cab Pickup",
  // "double_cab", "DoubleCab") into a stable comparison key so DB rows and
  // VEHICLE_TYPES_OPTIONS values can be matched fuzzily.
  const normalizeVT = (s: string | null | undefined) =>
    String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const poolVehicleTypeKeys = useMemo(() => {
    const set = new Set<string>();
    for (const v of poolVehicles as any[]) {
      const k = normalizeVT(v.vehicle_type);
      if (k) set.add(k);
    }
    return set;
  }, [poolVehicles]);

  const poolVehicleCount = (poolVehicles as any[]).length;


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
        return `Working-hours policy: ${p.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })} is outside the working window. Allowed window: ${winLabel}.`;
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
        cargo_weight_kg: (form as any).cargo_weight_kg === "" ? null : (form as any).cargo_weight_kg,
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
      // Retries up to 3 times because the helper now takes an advisory lock per
      // (org, type, day) — transient lock waits or network blips should not
      // block submission. The fallback only fires after all retries fail and
      // uses a high-entropy timestamp suffix that's still namespaced by VR-
      // and unlikely to collide with the sequential numbers (which top out at
      // 4 digits per day).
      let generatedNumber = "";
      for (let attempt = 0; attempt < 3 && !generatedNumber; attempt++) {
        try {
          const { data: rpcNum, error: rpcErr } = await (supabase as any).rpc(
            "generate_vehicle_request_number",
            { p_org_id: organizationId, p_request_type: safe.request_type }
          );
          if (!rpcErr && typeof rpcNum === "string" && rpcNum.length > 0) {
            generatedNumber = rpcNum;
          }
        } catch { /* retry */ }
      }
      if (!generatedNumber) {
        generatedNumber = `VR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      }


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
        // Preserve the requester's explicit selection (verbatim) and the
        // type the system inferred from the time window — both are surfaced
        // to dispatchers so a mismatch is visible end-to-end.
        requested_request_type: form.requested_request_type || safe.request_type,
        system_classified_type: (() => {
          if (safe.request_type !== "daily_operation" && safe.request_type !== "nighttime_operation") return null;
          const toMin = (t: string) => {
            if (!t) return null;
            const [h, m] = t.split(":").map(Number);
            if (Number.isNaN(h) || Number.isNaN(m)) return null;
            return h * 60 + m;
          };
          const sMin = toMin(form.start_time);
          const eMin = toMin(form.end_time);
          if (sMin == null && eMin == null) return null;
          const DS = 8 * 60 + 30, DE = 17 * 60 + 30;
          const isNight =
            (sMin != null && (sMin < DS || sMin > DE)) ||
            (eMin != null && (eMin > DE || eMin < DS));
          return isNight ? "nighttime_operation" : "daily_operation";
        })(),
        // OLA operation type drives SLA timer (10m / 30m / 1.5d / 30d)
        operation_type:
          (safe.request_type as string) === "incident_urgent" ? "incident_urgent" :
          safe.request_type === "field_operation" ? "field_work" :
          safe.request_type === "project_operation" ? "project_work" :
          "daily_operation",
        purpose:
          safe.purpose +
          filedOnBehalfNote +
          (form.cargo_description?.trim() ? `\n\nItems to transport: ${form.cargo_description.trim()}` : "") +
          (safe.contact_phone ? `\n\nContact phone: ${safe.contact_phone}` : ""),
        needed_from: neededFrom,
        needed_until: neededUntil,
        departure_place: safe.departure_place || null,
        destination: safe.destination || null,
        departure_lat: form.departure_lat,
        departure_lng: form.departure_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        // Per-operation vehicle caps were removed — every operation type may
        // request up to 50 vehicles. Dispatchers handle right-sizing downstream.
        num_vehicles: Math.min(Number(safe.num_vehicles) || 1, 50),
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
        cargo_weight_kg:
          (safe as any).cargo_weight_kg && Number((safe as any).cargo_weight_kg) > 0
            ? Number((safe as any).cargo_weight_kg)
            : null,
        recommended_vehicle_type: recommendation?.value || null,
        vehicle_type_justification:
          isUpgrade && safe.vehicle_type_justification?.trim()
            ? safe.vehicle_type_justification.trim()
            : null,
        // Night Request subcategory — only persisted when the operation is a Night Request.
        night_request_subcategory:
          safe.request_type === "nighttime_operation" && form.night_request_subcategory
            ? form.night_request_subcategory
            : null,
        status: "pending",
      };

      const { data, error } = await (supabase as any).from("vehicle_requests").insert(payload).select("id").single();
      if (error) throw error;

      // ── Persist ordered intermediate stops (waypoints) ──
      // Stored in `vehicle_request_stops` with sequence = 1..N. Keep any row
      // that has either a name OR coordinates — coords-only stops still
      // matter for routing. We auto-generate a placeholder name in that case.
      const cleanStops = (form.stops || [])
        .map((s, i) => {
          const trimmedName = (s.name || "").trim();
          const hasCoords = s.lat != null && s.lng != null;
          return {
            name: trimmedName || (hasCoords ? `Stop ${i + 1}` : ""),
            lat: s.lat ?? null,
            lng: s.lng ?? null,
            hasCoords,
            hasName: trimmedName.length > 0,
          };
        })
        .filter((s) => s.hasName || s.hasCoords);
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
      // If the requester picked a Tier-1 shared-ride match, link them now.
      if (selectedRide && data?.id) {
        joinRide.mutate({
          rideId: selectedRide.ride_id,
          vehicleRequestId: data.id,
          passengerUserId: user?.id ?? null,
          seats: Math.max(1, Number(form.passengers) || 1),
          pickupLabel: form.departure_place || null,
          pickupLat: form.departure_lat ?? null,
          pickupLng: form.departure_lng ?? null,
          dropoffLabel: form.destination || null,
        });
        setSelectedRide(null);
      }
      toast.success(
        canFileOnBehalf && onBehalfOf && onBehalfOf.id !== user?.id
          ? `Vehicle request submitted on behalf of ${onBehalfOf.name}`
          : "Vehicle request submitted successfully"
      );
      // Force an immediate refetch (not just mark stale) so the new row appears
      // right away in the requests table — invalidate covers all matching keys
      // (organization-scoped, role-scoped, paginated variants), and refetch
      // ensures it actually re-runs even if the list is currently mounted.
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      queryClient.invalidateQueries({ queryKey: ["my-vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["trip-mgmt-vehicle-requests"] });
      queryClient.refetchQueries({ queryKey: ["vehicle-requests"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["vehicle-requests-panel"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["my-vehicle-requests"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["trip-mgmt-vehicle-requests"], type: "active" });
      onOpenChange(false);
      setForm(initialWithPrefill);
      clearDraft();
      setOnBehalfOf(null);
      // Activity tracking: capture which user filed which request
      import("@/lib/sessionTracker").then(({ logActivity }) =>
        logActivity({
          event_type: "request_submitted",
          event_category: "vehicle_request",
          resource_type: "vehicle_request",
          resource_id: data?.id ?? null,
          metadata: { on_behalf_of: onBehalfOf?.id ?? null, source },
        }),
      ).catch(() => { /* non-blocking */ });
      onSubmitted?.({ id: data?.id });
    },
    onError: (err: any) => {
      const message = String(err?.message ?? "");
      const details = String(err?.details ?? "");
      const hint = String(err?.hint ?? "");
      const combined = [message, details, hint].filter(Boolean).join(" | ");

      // The pre-insert rating gate may surface as either a custom
      // `PENDING_RATINGS:N` exception or as a generic insert-policy error with
      // the real guidance in `hint`/`details`, depending on the client path.
      const pendingMatch = combined.match(/PENDING_RATINGS:(\d+)/);
      const isPendingRatingsGate =
        !!pendingMatch ||
        /Rate your previous completed trips before submitting a new request/i.test(combined) ||
        /previous trips first/i.test(combined);

      if (isPendingRatingsGate) {
        const count = pendingMatch?.[1];
        toast.error("Rate your previous trips first", {
          description: count
            ? `You have ${count} completed trip${count === "1" ? "" : "s"} that need a rating before you can submit a new request.`
            : "Complete the pending trip rating before submitting a new request.",
        });
        return;
      }

      toast.error(message || "Submission failed");
    },
  });

  // Centralised visibility derivation — single source of truth for which
  // sections / fields render for the current request_type. Keeps JSX free
  // of inline boolean spaghetti and makes the rules unit-testable.
  const visibility = useMemo(() => deriveVisibility(form.request_type), [form.request_type]);
  const { isNighttime, isDaily, isProject, isField, isMessenger, allowsMultipleVehicles } = visibility;
  // Per-operation vehicle caps were removed. Every operation type may request
  // up to the absolute hard ceiling (50). We still keep a passenger-driven
  // *suggestion* so a Daily trip for 30 pax pre-fills 2 vehicles, but the
  // user is free to override in either direction.
  const SINGLE_VEHICLE_MAX_PAX = 25;
  const paxBasedSuggestedVehicles = useMemo(() => {
    const raw = parseInt(form.passengers);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    if (raw <= SINGLE_VEHICLE_MAX_PAX) return 1;
    return Math.ceil(raw / SINGLE_VEHICLE_MAX_PAX);
  }, [form.passengers]);
  // Cap "No. of Vehicles" by the count actually present in the chosen pool
  // (when a pool is selected and has vehicles). Falls back to 50 otherwise.
  const effectiveMaxVehicles = form.pool_name && poolVehicleCount > 0
    ? poolVehicleCount
    : 50;
  useEffect(() => {
    const current = parseInt(form.num_vehicles) || 1;
    // Only bump UP to the passenger-driven minimum when crossing the 25-seat
    // boundary. Never force a cap-down — the user may legitimately want more.
    if (current < paxBasedSuggestedVehicles) {
      setForm((f) => ({ ...f, num_vehicles: String(paxBasedSuggestedVehicles) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxBasedSuggestedVehicles]);

  // Messenger Service is courier-style: motorcycle/scooter/bicycle only,
  // no passengers (driver only). When the user picks Messenger we force the
  // vehicle_type to motorbike (the operational default) and clear cargo to
  // "small" so the recommender can resolve.
  useEffect(() => {
    if (!isMessenger) return;
    setForm((f) => ({
      ...f,
      vehicle_type: f.vehicle_type && ["motorbike", "scooter", "bicycle"].includes(f.vehicle_type)
        ? f.vehicle_type
        : "motorbike",
      passengers: String(NON_PASSENGER_SENTINEL),
      cargo_load: f.cargo_load || "small",
      num_vehicles: "1",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMessenger]);

  // Conversely, if the user switches AWAY from Messenger Service while the
  // vehicle_type is still a courier-only class (motorbike/scooter/bicycle),
  // clear it so the recommender can pick a regular passenger/cargo class.
  useEffect(() => {
    if (isMessenger) return;
    if (form.vehicle_type && ["motorbike", "scooter", "bicycle"].includes(form.vehicle_type)) {
      setForm((f) => ({ ...f, vehicle_type: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMessenger]);

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

  // Live "machine clock" — re-renders every 30s so the system evaluation
  // reflects the user's actual local time (not just the typed start/end).
  const [machineNow, setMachineNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setMachineNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const DAY_START = 8 * 60 + 30;  // 08:30 local
  const DAY_END   = 17 * 60 + 30; // 17:30 local

  // Classify a single minute-of-day against the day window.
  const classifyMin = (m: number | null): "daily_operation" | "nighttime_operation" | null => {
    if (m == null) return null;
    return (m < DAY_START || m > DAY_END) ? "nighttime_operation" : "daily_operation";
  };

  // Current machine-clock classification (always available, even before times are typed).
  const machineNowMin = machineNow.getHours() * 60 + machineNow.getMinutes();
  const machineNowClass = classifyMin(machineNowMin)!;
  const machineNowLabel = machineNow.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const machineTzLabel = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "local"; }
  })();

  // Auto-pick Day vs Night request_type from the machine clock the FIRST time
  // the form is shown (and whenever it's still empty / hasn't been touched).
  // The user can always override via the dropdown — once they do, we stop
  // auto-overwriting via `userPickedRequestTypeRef`.
  const userPickedRequestTypeRef = useRef(false);
  useEffect(() => {
    if (open) userPickedRequestTypeRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (userPickedRequestTypeRef.current) return;
    if (form.request_type === "daily_operation" || form.request_type === "nighttime_operation") return;
    const auto = machineNowClass; // "daily_operation" | "nighttime_operation"
    setForm((f) => {
      if (f.request_type === "daily_operation" || f.request_type === "nighttime_operation") return f;
      const next = { ...f, request_type: auto, requested_request_type: auto };
      if (auto === "nighttime_operation") {
        if (!f.end_time) next.end_time = "06:00";
      } else {
        if (!f.end_time) next.end_time = "17:30";
      }
      return next;
    });
  }, [open, machineNowClass, form.request_type]);

  // Compute the system-classified trip type from the entered start/end times,
  // falling back to the current machine clock when no times are typed yet.
  // We DO NOT overwrite the requester's chosen request_type — both values
  // are preserved separately so dispatchers can see the original intent
  // alongside the system's evaluation when the two disagree.
  const systemClassifiedType = useMemo<"daily_operation" | "nighttime_operation" | null>(() => {
    if (form.request_type !== "daily_operation" && form.request_type !== "nighttime_operation") return null;
    const toMin = (t: string) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const startMin = toMin(form.start_time);
    const endMin = toMin(form.end_time);
    if (startMin == null && endMin == null) {
      // No times yet — use the live machine clock so the system is "aware of now".
      return machineNowClass;
    }
    const isNight =
      (startMin != null && (startMin < DAY_START || startMin > DAY_END)) ||
      (endMin   != null && (endMin   > DAY_END   || endMin   < DAY_START));
    return isNight ? "nighttime_operation" : "daily_operation";
  }, [form.request_type, form.start_time, form.end_time, machineNowClass]);

  // True when the requester picked one type but the times point to another.
  const requesterVsSystemMismatch =
    !!systemClassifiedType &&
    !!form.request_type &&
    systemClassifiedType !== form.request_type;


  // Professional, descriptive validation (per-field, on blur + on submit).
  const validation = useVehicleRequestValidation();
  const { getError, handleBlur, validateField, validateAll, errorCount } = validation;

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
      const startMs = form.start_date instanceof Date ? form.start_date.getTime() : new Date(form.start_date as any).getTime();
      const endMs = form.end_date instanceof Date ? form.end_date.getTime() : new Date(form.end_date as any).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
        const days = Math.max(1, Math.ceil((endMs - startMs) / 86_400_000) + 1);
        return `${days} day${days > 1 ? "s" : ""}`;
      }
    }
    return null;
  }, [isDaily, form.date, form.start_time, form.end_time, form.start_date, form.end_date]);

  // ── Resource-aware recommendation (demand-shaping) ────────────────────────
  // Recompute whenever passengers, cargo, or weight change. Stays a pure
  // derivation so the audit field `recommended_vehicle_type` always reflects
  // what the user saw at the moment they submitted.
  const cargoWeightKgNum = useMemo(() => {
    const n = Number(form.cargo_weight_kg);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [form.cargo_weight_kg]);

  // When a Specific Pool is chosen, derive the canonical vehicle-class values
  // that are physically available in that pool. This list feeds BOTH the
  // recommender (so it never recommends a class that isn't available, which
  // would falsely flag the only available class as an "upgrade") AND the
  // eligible-types dropdown below.
  const availableClassesInPool = useMemo<string[] | null>(() => {
    if (!form.pool_name || poolVehicleTypeKeys.size === 0) return null;
    const matched: string[] = [];
    for (const profile of VEHICLE_CLASS_CATALOG) {
      const valueKey = normalizeVT(profile.value);
      const labelKey = normalizeVT(profile.label);
      const inPool = Array.from(poolVehicleTypeKeys).some(
        (k) => k === valueKey || k === labelKey || k.includes(valueKey) || valueKey.includes(k),
      );
      if (inPool) matched.push(profile.value);
    }
    return matched;
  }, [form.pool_name, poolVehicleTypeKeys]);

  const recommendation = useMemo(() => {
    const raw = parseInt(form.passengers);
    const pax = raw === NON_PASSENGER_SENTINEL ? 1 : (raw || 1);
    // Default cargo to "none" so the recommender can drive auto-sync purely
    // from passenger count — even before the user has picked a Trip Load.
    // (Cargo Only / Passengers + Cargo trips override this with the real value.)
    const cargo = (form.cargo_load || "none") as CargoLoad;
    return recommendVehicleClass({
      passengers: pax,
      cargo,
      cargoWeightKg: cargoWeightKgNum || null,
      courierOnly: isMessenger,
      availableInPool: availableClassesInPool,
    });
  }, [form.passengers, form.cargo_load, cargoWeightKgNum, isMessenger, availableClassesInPool]);

  // Eligible vehicle types — driven by passengers + cargo + weight + service
  // type. Only types that can actually carry the requested load are surfaced
  // so users can't pick something that won't fit. Recommended type floats
  // to the top, then by cost-band rank. Motorbikes/scooters/bicycles are
  // restricted to Messenger Service only.
  const eligibleVehicleTypes = useMemo(() => {
    const passengersRaw = parseInt(form.passengers);
    const passengers = passengersRaw === NON_PASSENGER_SENTINEL
      ? 0
      : Math.max(1, passengersRaw || 1);
    const cargoOrder = { none: 0, small: 1, medium: 2, large: 3 } as const;
    const cargoNeeded = cargoOrder[(form.cargo_load || "none") as CargoLoad] ?? 0;
    // When a Specific Pool is chosen AND it has vehicles registered, restrict
    // selectable vehicle types to those physically present in that pool.
    // Empty pool inventory → fall back to capability-only filtering so the
    // user is not silently blocked by missing master-data.
    const restrictToPool = !!form.pool_name && poolVehicleTypeKeys.size > 0;
    let list = VEHICLE_TYPES_OPTIONS
      .map((vt) => ({ vt, profile: getVehicleClassProfile(vt.value) }))
      .filter(({ vt, profile }) => {
        if (!profile) return false;
        if (profile.costBand === "specialised") return false; // dispatcher-only
        // Courier-only classes (motorbike/scooter/bicycle) are restricted to
        // Messenger Service. Conversely, Messenger Service shows ONLY courier
        // classes — staff cannot order an SUV under "Messenger Service".
        if (isMessenger) {
          if (!profile.courierOnly) return false;
        } else {
          if (profile.courierOnly) return false;
        }
        if (passengers > 0 && profile.capacity < passengers) return false;
        if (cargoOrder[profile.cargo] < cargoNeeded) return false;
        if (cargoWeightKgNum > 0 && profile.maxPayloadKg < cargoWeightKgNum) return false;
        if (restrictToPool) {
          // Match either the canonical value ("double_cab") or the human
          // label ("DoubleCab"/"Double Cab Pickup") — DB rows use both.
          const valueKey = normalizeVT(vt.value);
          const labelKey = normalizeVT(vt.label);
          const inPool = Array.from(poolVehicleTypeKeys).some(
            (k) => k === valueKey || k === labelKey || k.includes(valueKey) || valueKey.includes(k),
          );
          if (!inPool) return false;
        }
        return true;
      });
    return list.sort((a, b) => {
      const aRec = recommendation?.value === a.vt.value ? -1 : 0;
      const bRec = recommendation?.value === b.vt.value ? -1 : 0;
      if (aRec !== bRec) return aRec - bRec;
      return (a.profile!.rank) - (b.profile!.rank);
    });
  }, [form.passengers, form.cargo_load, form.pool_name, cargoWeightKgNum, recommendation?.value, isMessenger, poolVehicleTypeKeys]);

  // Whenever passengers/cargo/weight change, clear the manual-override flag
  // so the recommender takes back control and downgrades/upgrades the
  // vehicle type to match the new load (e.g. 30 pax → bus, then 4 pax → sedan).
  useEffect(() => {
    userPickedVehicleTypeRef.current = false;
  }, [form.passengers, form.cargo_load, cargoWeightKgNum]);

  // Keep `vehicle_type` in sync with the live recommendation whenever
  // passengers/cargo change — UNLESS the user has manually overridden it.
  // This way, increasing passengers upgrades the recommendation (sedan → van
  // → bus) and decreasing them downgrades it back (bus → van → sedan), so
  // the form never "sticks" on a previously-larger class.
  useEffect(() => {
    if (!recommendation) return;
    if (isMessenger) return; // messenger service uses its own forced default
    if (userPickedVehicleTypeRef.current) return; // respect manual override
    if (form.vehicle_type !== recommendation.value) {
      setForm((f) => ({ ...f, vehicle_type: recommendation.value }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendation?.value, isMessenger]);

  // Passenger count is driven by the chosen Trip Type (Passengers Only /
  // Passengers + Cargo / Cargo Only), not by the currently selected vehicle.
  // We intentionally do NOT force passengers back to N/A just because a
  // non-passenger vehicle is temporarily selected; the eligibility effect
  // below will clear or replace incompatible vehicle types automatically.

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

  // Live-validate the *current* form (not the stale `errors` state, which only
  // reflects fields the user has blurred). This prevents the Submit button
  // from staying disabled after the user has fixed every field but hasn't
  // re-blurred them. `handleSubmit` still runs the full validateAll pipeline,
  // so this only controls the disabled state of the button itself.
  const liveValidation = useMemo(() => {
    try {
      const sanitized = sanitizeVehicleRequestForm(form as any) as any;
      return validateVehicleRequestForm({ ...form, ...sanitized } as any);
    } catch {
      return { valid: false, errors: {} as Record<string, string> };
    }
  }, [form]);

  const canSubmit =
    !!form.purpose &&
    !!form.purpose_category &&
    !!form.contact_phone?.trim() &&
    (isDaily ? !!form.date : !!form.start_date) &&
    (!isProject || !!form.project_number?.trim()) &&
    (!isUpgrade || !!form.vehicle_type_justification?.trim()) &&
    liveValidation.valid;

  const handleSubmit = () => {
    const sanitized = sanitizeVehicleRequestForm(form as any) as any;

    // Auto-sync start_time to current clock if user picked a past time on today's
    // trip date (daily / nighttime). Avoids a "start time in the past" validation
    // error at submit when the form was opened minutes earlier.
    const isDailyLike =
      sanitized.request_type === "daily_operation" ||
      sanitized.request_type === "nighttime_operation";
    if (isDailyLike && sanitized.start_time) {
      const tripDate = sanitized.date instanceof Date
        ? sanitized.date
        : (sanitized.date ? new Date(sanitized.date) : null);
      if (tripDate) {
        const today = new Date();
        const sameDay =
          tripDate.getFullYear() === today.getFullYear() &&
          tripDate.getMonth() === today.getMonth() &&
          tripDate.getDate() === today.getDate();
        if (sameDay) {
          const nowHHMM = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
          if (sanitized.start_time < nowHHMM) {
            sanitized.start_time = nowHHMM;
            if (sanitized.end_time && sanitized.end_time <= nowHHMM) {
              // Keep end_time after start; bump by 1 hour if it now precedes start.
              const [h, m] = nowHHMM.split(":").map(Number);
              const endMins = h * 60 + m + 60;
              const eh = Math.floor((endMins % 1440) / 60);
              const em = endMins % 60;
              sanitized.end_time = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
            }
            userTouchedStartTimeRef.current = true;
            toast.info(`Start time auto-updated to ${nowHHMM} (current time).`);
          }
        }
      }
    }

    setForm((f) => ({ ...f, ...sanitized }));

    // Night Request requires an explicit subcategory so dispatchers can
    // distinguish a planned night shift from an emergency.
    if (sanitized.request_type === "nighttime_operation" && !form.night_request_subcategory) {
      toast.error("Please choose a Night Request category (Night shift or Emergency).");
      requestAnimationFrame(() => {
        fieldAnchors.current["request_type" as keyof typeof fieldAnchors.current]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    const result = validateAll({ ...form, ...sanitized } as any);
    if (!result.valid) {
      const firstField = Object.keys(result.errors)[0];
      const firstMsg = (result.errors as any)[firstField];
      toast.error(firstMsg || "Please fix the highlighted fields before submitting.");
      requestAnimationFrame(() => {
        const anchor = fieldAnchors.current[firstField as keyof typeof fieldAnchors.current];
        anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
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
        return;
      }
    }

    // Operation type & priority must be explicitly chosen (no silent defaults).
    if (!form.request_type) {
      toast.error("Please select an operation type.");
      return;
    }
    if (!form.priority) {
      toast.error("Please select a priority.");
      return;
    }

    // Resource-aware demand shaping.
    if (!form.purpose_category) {
      toast.error("Select a business purpose category. Personal use of fleet vehicles is not permitted.");
      return;
    }
    if (isUpgrade && !form.vehicle_type_justification?.trim()) {
      toast.error(
        `You picked ${chosenProfile?.label || "a larger vehicle"} but ${recommendation?.label} is sufficient. Please add a justification.`
      );
      return;
    }

    // All validation passed — ask the user to confirm before firing off the
    // request. The actual mutation runs from the AlertDialog's confirm action.
    setConfirmOpen(true);
  };

  const update = <K extends keyof typeof initialForm>(key: K, val: (typeof initialForm)[K]) => {
    setForm(f => {
      const next = { ...f, [key]: val };
      // Re-validate this field live whenever it changes so any existing
      // error message clears (or appears) immediately — without waiting
      // for another blur. The full validation/touched flow still runs on
      // blur and on submit.
      try { validation.validateField(key as any, val, next as any); } catch { /* noop */ }
      return next;
    });
  };

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


  const HeaderInner = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          <Car className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">New Vehicle Request</h3>
      </div>
      {savedAt && (
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="w-3 h-3 text-success" />
          Auto-saved {new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
        </span>
      )}
    </div>
  );

  /** No-op: section headers removed for a fully flat form. Kept as a null
   *  component so existing call sites compile without churn. */
  const SectionHeader = (_: { icon: any; title: string }) => null;

  const body = (
    <>
      {embedded ? (
        <div className="px-5 sm:px-6 py-3 border-b border-border bg-card">
          {HeaderInner}
        </div>
      ) : (
        <div className="px-3 sm:px-5 md:px-6 py-3 border-b border-border bg-card sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="sr-only">Vehicle Request</DialogTitle>
            <DialogDescription className="sr-only">
              Vehicle request form — fill in the sections and submit.
            </DialogDescription>
            {HeaderInner}
          </DialogHeader>
        </div>
      )}

      <div className={`${embedded ? "px-1" : "px-3 sm:px-5 md:px-6"} pt-2 pb-1 space-y-3`}>
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



        {/* Single-page form — flat, professionally aligned */}
        <div className="space-y-5">
          {/* TYPE SECTION */}
          <section className="space-y-3">
            <SectionHeader icon={Sparkles} title="Vehicle Request Type" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {/* Vehicle Request Type */}
              <div className="space-y-2">
                <Label className="text-primary font-medium text-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Vehicle Request Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.request_type}
                  onValueChange={(v) => {
                    userPickedRequestTypeRef.current = true;
                    // When the user *manually* picks Night Request, snap the
                    // start/end times to the night window's lower bound (20:00 → 06:00)
                    // so the auto-classifier (08:30–17:30 = Day) doesn't immediately
                    // bounce them back to Day Operation.
                    if (v === "nighttime_operation") {
                      setForm((f) => ({
                        ...f,
                        request_type: v,
                        requested_request_type: v,
                        start_time: "20:00",
                        end_time: f.end_time && f.end_time !== "" ? f.end_time : "06:00",
                      }));
                      handleBlur("request_type", v, { ...(form as any), request_type: v });
                      return;
                    }
                    if (v === "daily_operation") {
                      // Reset to canonical day window if coming from night.
                      setForm((f) => ({
                        ...f,
                        request_type: v,
                        requested_request_type: v,
                        start_time: f.start_time && f.start_time !== "20:00" ? f.start_time : "08:30",
                        end_time: f.end_time && f.end_time !== "06:00" ? f.end_time : "17:30",
                      }));
                      handleBlur("request_type", v, { ...(form as any), request_type: v });
                      return;
                    }
                    setForm((f) => ({ ...f, request_type: v, requested_request_type: v }));
                    // Clear night subcategory when leaving Night Request.
                    if (v !== "nighttime_operation") {
                      update("night_request_subcategory", "" as any);
                    }
                    handleBlur("request_type", v, { ...(form as any), request_type: v });
                  }}
                >
                  <SelectTrigger
                    className={`w-full h-9 text-sm ${getError("request_type") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("request_type")}
                  >
                    <SelectValue placeholder="Please select request type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident_urgent">🚨 Incident / Urgent (10 min SLA)</SelectItem>
                    <SelectItem value="daily_operation">Day Request (8:30 AM – 5:30 PM) — 30 min SLA</SelectItem>
                    <SelectItem value="nighttime_operation">Night Request (8:00 PM – 6:00 AM)</SelectItem>
                    <SelectItem value="field_operation">Field Request — 1.5 day SLA</SelectItem>
                    <SelectItem value="project_operation">Project Request — 30 day SLA</SelectItem>
                    <SelectItem value="group_operation">Group Request</SelectItem>
                    <SelectItem value="messenger_service">Messenger Request</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError field="request_type" />
              </div>

              {/* Night Request subcategory — sits next to the request type when Night is selected. */}
              {isNighttime && (
                <div className="space-y-2">
                  <Label className="text-primary font-medium text-sm flex items-center gap-1.5 leading-tight">
                    <Moon className="w-4 h-4 shrink-0" />
                    <span>Night Request Category</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.night_request_subcategory || ""}
                    onValueChange={(v) => update("night_request_subcategory", v as any)}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select night request category…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="night_shift">🌙 Night shift request</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency request</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium">Night shift</span> for planned overnight work ·{" "}
                    <span className="font-medium">Emergency</span> for urgent night incidents.
                  </p>
                </div>
              )}
            </div>

            {/* Requester vs System trip-type evaluation
                ----------------------------------------
                Shows the requester's selected type alongside the type the
                system inferred from the start/end time window. Both values
                are persisted on the request so dispatchers can see the
                original intent even when they disagree. */}
            {systemClassifiedType && (
              <div
                className={`rounded-lg border p-2.5 text-xs flex flex-wrap items-center gap-2 ${
                  requesterVsSystemMismatch
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-muted/30"
                }`}
                role="status"
                aria-live="polite"
              >
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/40">
                  Requester time:{" "}
                  <span className="font-semibold">
                    {form.requested_request_type === "nighttime_operation" ? "Night Request" : "Day Request"}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] gap-1 ${
                    requesterVsSystemMismatch
                      ? "border-amber-500/60 text-amber-700 dark:text-amber-300"
                      : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  System-evaluated:{" "}
                  <span className="font-semibold">
                    {systemClassifiedType === "nighttime_operation" ? "Night Request" : "Day Request"}
                  </span>
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 border-sky-500/40 text-sky-700 dark:text-sky-300">
                  Machine clock:{" "}
                  <span className="font-semibold">
                    {machineNowLabel} ({machineTzLabel}) — {machineNowClass === "nighttime_operation" ? "Night" : "Day"} window
                  </span>
                </Badge>
                {requesterVsSystemMismatch ? (
                  <span className="text-amber-700 dark:text-amber-300">
                    ⚠ Times fall in the {systemClassifiedType === "nighttime_operation" ? "night" : "day"} window —
                    your selection is preserved, but dispatch will see both.
                  </span>
                ) : (
                  <span className="text-muted-foreground">Selection matches the time window.</span>
                )}
              </div>
            )}
          </section>

          {/* SCHEDULE + ROUTE — placed side by side on wider screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="space-y-3">
              <SectionHeader icon={CalendarDays} title="Schedule" />
              {isDaily ? (
                <div
                  ref={(node) => { fieldAnchors.current.date = node; fieldAnchors.current.start_time = node; fieldAnchors.current.end_time = node; }}
                >
                  <DateTimeRangeField
                    date={form.date}
                    startTime={form.start_time}
                    endTime={form.end_time}
                    onDateChange={(d) => { userTouchedDateRef.current = true; update("date", d); handleBlur("date", d, form as any); handleBlur("start_time", form.start_time, { ...form, date: d } as any); }}
                    onStartTimeChange={(v) => { userTouchedStartTimeRef.current = true; update("start_time", v); }}
                    onEndTimeChange={(v) => update("end_time", v)}
                    onBlurStart={() => handleBlur("start_time", form.start_time, form as any)}
                    onBlurEnd={() => handleBlur("end_time", form.end_time, form as any)}
                    errorDate={!!getError("date")}
                    errorStart={!!getError("start_time")}
                    errorEnd={!!getError("end_time")}
                    minDate={new Date()}
                  />
                  <div className="space-y-0.5 mt-1">
                    <FieldError field="date" />
                    <FieldError field="start_time" />
                    <FieldError field="end_time" />
                  </div>
                </div>
              ) : (
                <div className={visibility.showProjectNumber ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5" : ""}>
                  <div
                    ref={(node) => { fieldAnchors.current.start_date = node; fieldAnchors.current.end_date = node; }}
                  >
                    <DateRangeField
                      startDate={form.start_date}
                      endDate={form.end_date}
                      onStartDateChange={(d) => { update("start_date", d); handleBlur("start_date", d, form as any); }}
                      onEndDateChange={(d) => { update("end_date", d); handleBlur("end_date", d, form as any); }}
                      minStart={new Date()}
                      endRequired={isProject}
                      errorStart={!!getError("start_date")}
                      errorEnd={!!getError("end_date")}
                      withTimes
                      startTime={form.start_date_time}
                      endTime={form.end_date_time}
                      onStartTimeChange={(v) => update("start_date_time", v)}
                      onEndTimeChange={(v) => update("end_date_time", v)}
                    />
                    <div className="space-y-0.5 mt-1">
                      <FieldError field="start_date" />
                      <FieldError field="end_date" />
                    </div>
                  </div>
                  {visibility.showProjectNumber && (
                    <div ref={(node) => { fieldAnchors.current.project_number = node; }}>
                      <VRField
                        id="vr-project-number"
                        label="Project Number"
                        icon={FileText}
                        required
                        error={getError("project_number")}
                      >
                        <Input
                          value={form.project_number}
                          onChange={e => update("project_number", e.target.value)}
                          onBlur={e => handleBlur("project_number", e.target.value, form as any)}
                          placeholder="e.g. PRJ-2026-001"
                          className="h-9 text-sm"
                        />
                      </VRField>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ROUTE SECTION */}
            <section className="space-y-3">
              <SectionHeader icon={MapPin} title="Route" />
              <RouteField
                departure={form.departure_place}
                departureLat={form.departure_lat}
                departureLng={form.departure_lng}
                destination={form.destination}
                destinationLat={form.destination_lat}
                destinationLng={form.destination_lng}
                stops={form.stops as any}
                onDepartureChange={(v) => { update("departure_place", v); handleBlur("departure_place", v, form as any); }}
                onDepartureCoords={(lat, lng) => {
                  update("departure_lat", lat);
                  update("departure_lng", lng);
                  // Re-validate departure_place now that we have real coords —
                  // this clears the "Pick on the map" error the moment a
                  // coordinate is captured.
                  handleBlur("departure_place", form.departure_place, {
                    ...form, departure_lat: lat, departure_lng: lng,
                  } as any);
                }}
                onDestinationChange={(v) => { update("destination", v); handleBlur("destination", v, form as any); }}
                onDestinationCoords={(lat, lng) => {
                  update("destination_lat", lat);
                  update("destination_lng", lng);
                  handleBlur("destination", form.destination, {
                    ...form, destination_lat: lat, destination_lng: lng,
                  } as any);
                }}
                onStopsChange={(stops) => {
                  update("stops", stops as any);
                  handleBlur("stops", stops as any, { ...form, stops } as any);
                }}
              />
              <div className="space-y-0.5">
                <FieldError field="departure_place" />
                <FieldError field="destination" />
                <FieldError field="stops" />
              </div>
              {/* Tier-1 Direct Match — surfaced as soon as origin/destination/time are picked. */}
              <SharedRideMatchSuggestions
                poolCode={form.pool_name || null}
                originLat={form.departure_lat}
                originLng={form.departure_lng}
                destinationLat={form.destination_lat}
                destinationLng={form.destination_lng}
                departureAt={form.start_date instanceof Date ? form.start_date : null}
                passengers={Math.max(1, Number(form.passengers) || 1)}
                selectedRideId={selectedRide?.ride_id ?? null}
                onSelect={(ride) =>
                  setSelectedRide((cur) => (cur?.ride_id === ride.ride_id ? null : ride))
                }
              />
            </section>
          </div>

          {/* RESOURCES SECTION */}
          <section className="space-y-3">
            <SectionHeader icon={Layers} title="Vehicle & Resources" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Pool Category and Specific Pool come first — Vehicle Type and
                  No. of Vehicles below are filtered by the chosen pool's
                  actual inventory, so the user MUST pick a pool first. */}
              <div>
                <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Pool Category</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.pool_category}
                  onValueChange={v => {
                    userTouchedPoolRef.current = true;
                    update("pool_category", v);
                    handleBlur("pool_category", v, form as any);
                    // Reset the dependent location whenever category changes
                    const meta = POOL_CATEGORY_META[v as keyof typeof POOL_CATEGORY_META];
                    const cur = ASSIGNED_LOCATIONS.find(l => l.value === form.pool_name);
                    if (!cur || cur.group !== meta?.locationGroup) {
                      update("pool_name", "");
                    }
                  }}
                >
                  <SelectTrigger
                    className={`h-9 text-sm ${getError("pool_category") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("pool_category")}
                  >
                    <SelectValue placeholder="Please select category…">
                      {form.pool_category && <PoolCategoryChip value={form.pool_category} />}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate"><PoolCategoryChip value="corporate" /></SelectItem>
                    <SelectItem value="zone"><PoolCategoryChip value="zone" /></SelectItem>
                    <SelectItem value="region"><PoolCategoryChip value="region" /></SelectItem>
                  </SelectContent>
                </Select>
                <FieldError field="pool_category" />
              </div>

              <div>
                <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Specific Pool</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.pool_name}
                  onValueChange={v => { userTouchedPoolRef.current = true; update("pool_name", v); handleBlur("pool_name", v, { ...form, pool_name: v } as any); }}
                  disabled={!form.pool_category}
                >
                  <SelectTrigger
                    className={`h-9 text-sm ${!form.pool_category ? "opacity-50" : ""} ${getError("pool_name") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("pool_name")}
                  >
                    <SelectValue placeholder={form.pool_category ? "Select location..." : "Pick category first"}>
                      {form.pool_name && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span className="truncate">
                            {ASSIGNED_LOCATIONS.find(l => l.value === form.pool_name)?.label || form.pool_name}
                          </span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(() => {
                      const inCategory = ASSIGNED_LOCATIONS.filter(
                        (l: any) =>
                          form.pool_category === "corporate"
                            ? l.group === "Corporate"
                            : l.group === POOL_CATEGORY_META[form.pool_category as keyof typeof POOL_CATEGORY_META]?.locationGroup,
                      );
                      const allowed = poolUnrestricted
                        ? inCategory
                        : inCategory.filter((l: any) => userPoolCodes.includes(l.value));

                      if (!poolUnrestricted && allowed.length === 0) {
                        return (
                          <div className="px-3 py-4 text-xs text-muted-foreground">
                            {hasAnyMembership
                              ? "No pools in this category are assigned to you."
                              : "You aren't assigned to any pool yet. Ask your fleet admin to add you to a pool."}
                          </div>
                        );
                      }

                      if (form.pool_category === "corporate") {
                        return allowed
                          .filter((l: any) => !l.parent)
                          .flatMap((parent: any) => {
                            const subs = allowed.filter((l: any) => l.parent === parent.value);
                            if (!poolUnrestricted && subs.length === 0 && !userPoolCodes.includes(parent.value)) {
                              return [];
                            }
                            return [
                              <SelectItem key={parent.value} value={parent.value}>
                                <span className="flex items-center gap-2 font-semibold">
                                  {parent.label}
                                </span>
                              </SelectItem>,
                              ...subs.map((s: any) => (
                                <SelectItem key={s.value} value={s.value}>
                                  <span className="flex items-center gap-2 pl-4 text-sm">
                                    <span className="truncate">{s.label}</span>
                                    {s.shift && s.shift !== "all" && (
                                      <span className="ml-auto text-[10px] uppercase text-muted-foreground">{s.shift}</span>
                                    )}
                                  </span>
                                </SelectItem>
                              )),
                            ];
                          });
                      }
                      return allowed.map((l: any) => (
                        <SelectItem key={l.value} value={l.value}>
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {l.label}
                          </span>
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                {form.pool_name && poolVehicleCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {poolVehicleCount} vehicle{poolVehicleCount === 1 ? "" : "s"} available in this pool
                    {poolVehicleTypeKeys.size > 0 && ` · ${poolVehicleTypeKeys.size} type${poolVehicleTypeKeys.size === 1 ? "" : "s"}`}
                  </p>
                )}
                {form.pool_name && poolVehicleCount === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    No vehicles registered in this pool yet — vehicle type list shows all eligible classes.
                  </p>
                )}
                <FieldError field="pool_name" />
              </div>

              {/* No. Of Vehicles is rendered inline next to the Trip Type
                  field below to keep related quantity inputs side-by-side. */}
              <VRField
                id="vr-trip-mode"
                label="Trip Type"
                icon={Route}
                required
                error={getError("trip_type")}
              >
                <Select
                  value={form.trip_type}
                  onValueChange={v => { update("trip_type", v); handleBlur("trip_type", v, form as any); }}
                >
                  <SelectTrigger
                    className={`h-9 text-sm ${getError("trip_type") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("trip_type")}
                  >
                    <SelectValue placeholder="Please select trip type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_way">One Way Trip</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                  </SelectContent>
                </Select>
              </VRField>
              {(() => {
                /*
                 * Trip Type (load mode) + Passengers count rendered as TWO
                 * adjacent grid cells so they sit side-by-side instead of
                 * stacked. Both are derived from the same state machine:
                 *  • Passengers Only   → cargo cleared, passengers required
                 *  • Passengers + Cargo → cargo + passengers required
                 *  • Cargo Only         → passengers = N/A sentinel
                 * Becomes read-only "N/A" only when a non-passenger vehicle
                 * type (courier/cargo truck) is explicitly chosen.
                 */
                const passengersIsNA = form.passengers === String(NON_PASSENGER_SENTINEL);
                const hasCargo = !!form.cargo_load && form.cargo_load !== "none";
                const mode: "passengers_only" | "passengers_cargo" | "cargo_only" = passengersIsNA
                  ? "cargo_only"
                  : hasCargo
                    ? "passengers_cargo"
                    : "passengers_only";
                const switchMode = (next: "passengers_only" | "passengers_cargo" | "cargo_only") => {
                  setTripTypeTouched(true);
                  if (next === mode && tripTypeTouched) return;
                  setForm((f) => {
                    const base = {
                      ...f,
                      passengers:
                        f.passengers === String(NON_PASSENGER_SENTINEL)
                          ? ""
                          : f.passengers,
                      cargo_load: "none" as CargoLoad,
                      cargo_weight_kg: "",
                    };
                    if (next === "passengers_only") {
                      return { ...base, passengers: base.passengers || "1" };
                    }
                    if (next === "passengers_cargo") {
                      return {
                        ...base,
                        passengers: base.passengers || "1",
                        cargo_load: "small" as CargoLoad,
                      };
                    }
                    return {
                      ...base,
                      passengers: String(NON_PASSENGER_SENTINEL),
                      cargo_load: "medium" as CargoLoad,
                    };
                  });
                };
                const passengersError =
                  mode === "cargo_only"
                    ? undefined
                    : getError("passengers");
                return (
                  <VRField
                    id="vr-trip-type"
                    label="Trip Load"
                    icon={Users}
                    required
                    error={passengersError}
                  >
                    <Select value={tripTypeTouched ? mode : ""} onValueChange={(v) => switchMode(v as "passengers_only" | "passengers_cargo" | "cargo_only")}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Please select trip load…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passengers_only">Passengers Only</SelectItem>
                        <SelectItem value="passengers_cargo">Passengers + Cargo</SelectItem>
                        <SelectItem value="cargo_only">Cargo Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </VRField>
                );
              })()}
              {(() => {
                // Cargo fields appear only when the load mode is
                // "Passengers + Cargo" or "Cargo Only". In "Passengers Only"
                // they are irrelevant and stay hidden to reduce noise.
                const passengersIsNA = form.passengers === String(NON_PASSENGER_SENTINEL);
                const hasCargo = !!form.cargo_load && form.cargo_load !== "none";
                const showCargoFields = passengersIsNA || hasCargo;
                if (!showCargoFields) return null;
                return (
                  <>
                    <div>
                      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                        <Package className="w-4 h-4 shrink-0" />
                        <span>Item Description</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={form.cargo_description}
                        onChange={(e) => {
                          update("cargo_description", e.target.value);
                          // Ensure a sensible default cargo_load so the
                          // recommender keeps working even though the user
                          // no longer picks a size explicitly. Weight (below)
                          // can still bump it to medium/large.
                          if (e.target.value.trim() && !form.cargo_load) {
                            update("cargo_load", "small" as CargoLoad);
                          }
                        }}
                        onBlur={(e) => handleBlur("cargo_load", form.cargo_load || (e.target.value.trim() ? "small" : ""), { ...form, cargo_description: e.target.value } as any)}
                        placeholder="e.g. 5 boxes of office supplies, ~20kg"
                        maxLength={300}
                        className={`h-9 text-sm ${getError("cargo_load") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                        aria-invalid={!!getError("cargo_load")}
                      />
                      <FieldError field="cargo_load" />
                    </div>

                    <div>
                      <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                        <Package className="w-4 h-4 shrink-0" />
                        <span>Total Cargo Weight (kg)</span>
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={50000}
                          step={1}
                          value={form.cargo_weight_kg}
                          onChange={(e) => {
                            update("cargo_weight_kg", e.target.value);
                            validateField("cargo_weight_kg", e.target.value, { ...form, cargo_weight_kg: e.target.value } as any);
                          }}
                          onBlur={(e) => {
                            handleBlur("cargo_weight_kg", e.target.value, { ...form, cargo_weight_kg: e.target.value } as any);
                            handleBlur("vehicle_type", form.vehicle_type, { ...form, cargo_weight_kg: e.target.value } as any);
                          }}
                          placeholder="e.g. 250"
                          className={`h-9 text-sm pr-12 ${getError("cargo_weight_kg") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                          aria-invalid={!!getError("cargo_weight_kg")}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          kg
                        </span>
                      </div>
                      <FieldError field="cargo_weight_kg" />
                    </div>
                  </>
                );
              })()}

              {(() => {
                const passengersIsNA = form.passengers === String(NON_PASSENGER_SENTINEL);
                if (passengersIsNA) return null;
                return (
                  <VRField
                    id="vr-passengers"
                    label="No. of Passengers"
                    icon={Users}
                    required
                    error={getError("passengers")}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="e.g. 4"
                      value={form.passengers}
                      onChange={e => update("passengers", e.target.value)}
                      onBlur={e => handleBlur("passengers", e.target.value, form as any)}
                      className="h-9 text-sm"
                    />
                  </VRField>
                );
              })()}

              <VRField
                id="vr-num-vehicles"
                label="No. of Vehicles"
                icon={Car}
                required
                error={getError("num_vehicles")}
              >
                <div>
                  <Input
                    type="number"
                    min={1}
                    max={effectiveMaxVehicles}
                    value={form.num_vehicles}
                    onChange={e => update("num_vehicles", e.target.value)}
                    onBlur={e => handleBlur("num_vehicles", e.target.value, form as any)}
                    className="h-9 text-sm"
                  />
                  {paxBasedSuggestedVehicles > 1 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Suggested: {paxBasedSuggestedVehicles} vehicles for {parseInt(form.passengers) || 0} passengers (25 seats / vehicle).
                    </p>
                  )}
                </div>
              </VRField>

              <div>
                <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                  <Car className="w-4 h-4 shrink-0" />
                  <span>Vehicle Type</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.vehicle_type}
                  onValueChange={v => {
                    // Mark as manually overridden ONLY if the user picked
                    // something different from the live recommendation.
                    // Picking the recommendation itself keeps auto-sync on.
                    userPickedVehicleTypeRef.current =
                      !!recommendation && v !== recommendation.value;
                    update("vehicle_type", v);
                    handleBlur("vehicle_type", v, { ...form, vehicle_type: v } as any);
                  }}
                >
                  <SelectTrigger
                    className={`h-9 text-sm ${getError("vehicle_type") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("vehicle_type")}
                  >
                    <SelectValue placeholder="Please select vehicle type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleVehicleTypes.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No vehicle class fits the selected passengers / cargo.
                      </div>
                    ) : (
                      eligibleVehicleTypes.map(({ vt }) => (
                        <SelectItem key={vt.value} value={vt.value}>
                          <span className="text-sm">{vt.label}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FieldError field="vehicle_type" />
              </div>

              {isUpgrade && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label className="text-amber-600 dark:text-amber-400 font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Justification</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={form.vehicle_type_justification}
                    onChange={(e) => update("vehicle_type_justification", e.target.value)}
                    placeholder="Why is a larger vehicle needed?"
                    rows={2}
                    maxLength={500}
                  />
                </div>
              )}
              {/* Pool Category and Specific Pool moved to the top of the
                  Resources section so vehicle type / count can derive their
                  available options from the chosen pool inventory. */}
              <div>
                <VRField
                  id="vr-contact-phone"
                  label="Contact Phone"
                  icon={UserCog}
                  required
                  error={getError("contact_phone")}
                  hint={
                    !form.contact_phone?.trim() && !requesterPhone
                      ? "No phone on file for this requester — please type one."
                      : undefined
                  }
                >
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.contact_phone}
                    onChange={e => { userTouchedContactPhoneRef.current = true; update("contact_phone", e.target.value); }}
                    onBlur={e => handleBlur("contact_phone", e.target.value, form as any)}
                    placeholder="e.g. 0911 234 567 or +251 911 234 567"
                    aria-invalid={!!getError("contact_phone")}
                    className={`h-9 text-sm ${getError("contact_phone") ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive/40" : ""}`}
                  />
                </VRField>
              </div>
              <div>
                <Label className="text-primary font-medium text-sm mb-1 flex items-center gap-1.5 leading-tight">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Business Purpose</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.purpose_category}
                  onValueChange={(v) => { update("purpose_category", v); handleBlur("purpose_category", v, form as any); }}
                >
                  <SelectTrigger
                    className={`h-9 text-sm ${getError("purpose_category") ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                    aria-invalid={!!getError("purpose_category")}
                  >
                    <SelectValue placeholder="Please select business purpose…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[420px]">
                    {BUSINESS_PURPOSE_GROUPS.map((g) => {
                      const items = BUSINESS_PURPOSE_CATEGORIES.filter(
                        (c) => c.group === g.id && !c.hidden,
                      );
                      if (items.length === 0) return null;
                      return (
                        <SelectGroup key={g.id}>
                          <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                            {g.label}
                          </SelectLabel>
                          {items.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              <span className="text-sm">{c.label}</span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FieldError field="purpose_category" />
              </div>
            </div>
          </section>

          {/* DETAILS SECTION */}
          <section className="space-y-3">
            <SectionHeader icon={FileText} title="Purpose & Details" />
            <VRField
              id="vr-purpose"
              label="Trip Description"
              icon={FileText}
              required
              error={getError("purpose")}
            >
              <Textarea
                value={form.purpose}
                onChange={e => update("purpose", e.target.value.slice(0, 1000))}
                onBlur={e => handleBlur("purpose", e.target.value, form as any)}
                placeholder="e.g. Describe the trip purpose (min 10 characters)…"
                rows={3}
                maxLength={1000}
              />
            </VRField>
            {/* Approval Routing block intentionally removed — routing is handled
                automatically server-side via route_vehicle_request_approval and
                surfaced to approvers in their own queue. */}
          </section>
        </div>
      </div>

      {(() => {
        const FooterInner = (
          <div className="flex w-full items-center justify-end gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setForm(buildInitialForm()); validation.reset(); }}
              className="text-muted-foreground h-8 px-2"
            >
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending || hasPendingRatings}
              title={
                hasPendingRatings
                  ? "Rate your previous trips before submitting"
                  : !canSubmit
                    ? "Some required fields are missing — click to see what's needed"
                    : undefined
              }
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {createMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        );
        return embedded ? (
          <div className="pt-4 border-t border-border/60 mt-4">{FooterInner}</div>
        ) : (
          <DialogFooter className="px-3 sm:px-5 md:px-6 py-3 mt-4 bg-muted/30 border-t border-border/60 sm:justify-between sticky bottom-0 z-10">
            {FooterInner}
          </DialogFooter>
        );
      })()}

      {/* Submit confirmation — fires the createMutation only on explicit
          user confirmation. Cancel just closes and leaves the form intact. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this vehicle request?</AlertDialogTitle>
            <AlertDialogDescription>
              {form.request_type === "project_operation"
                ? "Project requests are routed to fleet & finance approvers and cannot be edited after submission."
                : "Once submitted, this request goes into the dispatch queue. You can still cancel it from My Requests if plans change."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMutation.isPending}>
              No, keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={createMutation.isPending}
              onClick={() => {
                setConfirmOpen(false);
                createMutation.mutate();
              }}
            >
              {createMutation.isPending ? "Submitting…" : "Yes, submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    return <div className="space-y-3">{isDriverOnly ? blockedBody : body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl max-h-[94vh] overflow-y-auto p-0 gap-0">
        {isDriverOnly ? blockedBody : body}
      </DialogContent>
    </Dialog>
  );
};
