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
import { Clock, Users, Car, Route, UserCog, X, MapPin, Layers, FileText, Sparkles, CalendarDays, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DateTimePicker, combineDateAndTime } from "@/components/ui/date-time-picker";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import { VEHICLE_TYPES_OPTIONS, ASSIGNED_POOLS } from "@/components/fleet/formConstants";
import { AlertCircle } from "lucide-react";
import { useVehicleRequestValidation } from "./useVehicleRequestValidation";
import { sanitizeVehicleRequestForm } from "./vehicleRequestValidation";

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
  // Default to the requester's current machine time (rounded up to next 5 min).
  // End defaults to start + 60 min so the slot is always valid out of the box.
  start_time: roundedNowHHMM(),
  end_time: roundedNowHHMM(60),
  start_date: undefined as Date | undefined,
  start_date_time: roundedNowHHMM(),
  end_date: undefined as Date | undefined,
  end_date_time: roundedNowHHMM(60),
  departure_place: "",
  destination: "",
  departure_lat: null as number | null,
  departure_lng: null as number | null,
  destination_lat: null as number | null,
  destination_lng: null as number | null,
  num_vehicles: "1",
  passengers: "1",
  vehicle_type: "",
  trip_type: "",
  pool_category: "",
  pool_name: "",
  purpose: "",
  project_number: "",
  // New: priority + contact phone — surfaced for dispatch/approver context.
  priority: "normal",
  contact_phone: "",
});

const initialForm = buildInitialForm();

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
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredAt]);

  // Super-admin only: file the request on behalf of another user or driver
  const [onBehalfOf, setOnBehalfOf] = useState<{ id: string; name: string; email: string; type: "user" | "driver"; driverId?: string } | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"type" | "schedule" | "route" | "resources" | "details">("type");

  // Default duration (in days) per request type — used to auto-derive end_date
  // dynamically from start_date so requesters don't have to compute it manually.
  // Users can still override the picker; we only fill when end_date is empty
  // OR when it's still equal to the previously-derived default.
  const DEFAULT_DURATION_DAYS: Record<string, number> = {
    daily_operation: 0,
    project_operation: 7,
    field_operation: 30,
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
    enabled: !!organizationId && open && isSuperAdmin,
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

  const filteredPools = useMemo(() => {
    if (!form.pool_category) return [];
    const dbPools = pools.filter((p: any) => p.category === form.pool_category);
    if (dbPools.length > 0) return dbPools.map((p: any) => p.name);
    return POOL_HIERARCHY[form.pool_category] || [];
  }, [form.pool_category, pools]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // The JWT identity (always the real signed-in user — super_admin while
      // impersonating). Used only as a fallback when there's no impersonation
      // override in play.
      const jwtUser = (await supabase.auth.getUser()).data.user;
      const jwtProfile = (await supabase.from("profiles").select("full_name").eq("id", jwtUser!.id).single()).data;

      // Acting identity = impersonated user when present, else JWT user.
      const actingUser = user ?? jwtUser;
      const actingProfile = profile ?? jwtProfile;

      // Real super_admin can file on behalf of someone else (manual picker OR
      // automatic impersonation override). Otherwise we file as the acting user.
      const useOnBehalf = isRealSuperAdmin && !!onBehalfOf;
      const requesterId = useOnBehalf ? onBehalfOf!.id : actingUser!.id;
      const requesterName = useOnBehalf
        ? onBehalfOf!.name
        : (actingProfile?.full_name || actingUser!.email || "Unknown");
      const filerName = realProfile?.full_name || realUser?.email || jwtProfile?.full_name || jwtUser?.email || "Admin";
      const filedOnBehalfNote = useOnBehalf
        ? ` (filed by ${filerName} on behalf of ${onBehalfOf!.name}${isImpersonating ? " — via impersonation" : ""})`
        : "";

      let neededFrom: string;
      let neededUntil: string | null = null;

      if (form.request_type === "daily_operation") {
        neededFrom = combineDateAndTime(form.date, form.start_time) || new Date().toISOString();
        neededUntil = combineDateAndTime(form.end_date || form.date, form.end_time) || null;
      } else {
        neededFrom = combineDateAndTime(form.start_date, form.start_date_time) || new Date().toISOString();
        neededUntil = combineDateAndTime(form.end_date, form.end_date_time) || null;
      }

      const payload = {
        organization_id: organizationId!,
        request_number: `VR-${Date.now().toString(36).toUpperCase()}`,
        requester_id: requesterId,
        requester_name: requesterName,
        request_type: form.request_type,
        purpose:
          form.purpose +
          filedOnBehalfNote +
          (form.contact_phone ? `\n\nContact phone: ${form.contact_phone}` : ""),
        needed_from: neededFrom,
        needed_until: neededUntil,
        departure_place: form.departure_place || null,
        destination: form.destination || null,
        departure_lat: form.departure_lat,
        departure_lng: form.departure_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        num_vehicles: allowsMultipleVehicles ? (parseInt(form.num_vehicles) || 1) : 1,
        passengers: parseInt(form.passengers) || 1,
        vehicle_type: form.vehicle_type || null,
        trip_type: form.trip_type || null,
        pool_category: form.pool_category || null,
        pool_name: form.pool_name || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        project_number: form.request_type === "project_operation" ? (form.project_number || null) : null,
        priority: form.priority || "normal",
        status: "pending",
      };

      const { data, error } = await (supabase as any).from("vehicle_requests").insert(payload).select("id").single();
      if (error) throw error;

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
        isRealSuperAdmin && onBehalfOf
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
    onError: (err: any) => toast.error(err.message),
  });

  const isDaily = form.request_type === "daily_operation";
  const isProject = form.request_type === "project_operation";
  const isField = form.request_type === "field_operation";

  // Single-vehicle policy: only Project Operations can request multiple vehicles.
  // Daily and Field operations are 1:1 (one driver, one vehicle).
  const allowsMultipleVehicles = isProject;
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

  const canSubmit =
    !!form.purpose &&
    (isDaily ? !!form.date : !!form.start_date) &&
    (!isProject || !!form.project_number?.trim()) &&
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
    createMutation.mutate();
  };

  const update = <K extends keyof typeof initialForm>(key: K, val: (typeof initialForm)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  /** Small inline error renderer (only shows when field has been touched). */
  const FieldError = ({ field }: { field: Parameters<typeof getError>[0] }) => {
    const msg = getError(field);
    if (!msg) return null;
    return (
      <p className="mt-1 flex items-start gap-1 text-[11px] text-destructive animate-fade-in">
        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
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
    resources: !!form.num_vehicles && !!form.passengers,
    details: !!form.purpose,
  };

  const body = (
    <>
      {!embedded && (
        <div className="relative -m-6 mb-0 px-6 pt-6 pb-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-b border-border/50 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-md" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Car className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Fleet Request Form
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  A guided 5-step intake — fields adapt as you go. Progress auto-saves.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="hidden md:inline-flex items-center gap-1 border-primary/30 bg-background/60 backdrop-blur">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-[11px]">Step {tabIndex + 1} of {TABS.length}</span>
              </Badge>
            </div>
          </DialogHeader>
        </div>
      )}

      <div className="px-1 pt-4 space-y-4">
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
              onClick={() => { clearDraft(); setForm(initialWithPrefill); }}
            >
              Discard draft
            </Button>
          </div>
        )}

        {/* Super-admin: file on behalf of any user */}
        {isSuperAdmin && (
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
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Driver</Badge>
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
                                <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
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

        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full h-auto p-1.5 bg-muted/40 backdrop-blur grid grid-cols-5 gap-1 rounded-xl">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const done = tabComplete[tab.id] && !active;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </span>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium leading-none">{tab.label}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block leading-none">{tab.hint}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* TYPE TAB */}
          <TabsContent value="type" className="mt-5 space-y-4 animate-fade-in">
            <Label className="text-primary font-medium">Vehicle Request Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { v: "daily_operation", title: "Daily Operation", desc: "Single-day trip with start & end time", icon: Clock },
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
                    className={`group relative text-left rounded-xl border p-4 transition-all hover-scale ${active ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-sm">{title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                    {active && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-primary" /></div>}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="mt-5 space-y-4 animate-fade-in">
            {isDaily ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <DateTimePicker label="Date" date={form.date} onDateChange={d => { update("date", d); handleBlur("date", d, form as any); handleBlur("start_time", form.start_time, { ...form, date: d } as any); }} required minDate={new Date()} hideTime />
                  <FieldError field="date" />
                </div>
                <div>
                  <Label className="text-primary font-medium">Start Time <span className="text-destructive">*</span></Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={e => update("start_time", e.target.value)}
                    onBlur={e => handleBlur("start_time", e.target.value, form as any)}
                    required
                    className="h-10"
                    aria-invalid={!!getError("start_time")}
                  />
                  <FieldError field="start_time" />
                </div>
                <div>
                  <Label className="text-primary font-medium">End Time <span className="text-destructive">*</span></Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={e => update("end_time", e.target.value)}
                    onBlur={e => handleBlur("end_time", e.target.value, form as any)}
                    required
                    className="h-10"
                    aria-invalid={!!getError("end_time")}
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
                {isProject && (
                  <div>
                    <Label className="text-primary font-medium">Project Number <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.project_number}
                      onChange={e => update("project_number", e.target.value)}
                      onBlur={e => handleBlur("project_number", e.target.value, form as any)}
                      placeholder="e.g. PRJ-2026-001"
                      className="h-10"
                      aria-invalid={!!getError("project_number")}
                    />
                    <FieldError field="project_number" />
                  </div>
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
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-blue-400">Field Operation Note</p>
                <p>Field operations may require special vehicle types and extended durations. Ensure GPS tracking is enabled for the duration of the trip.</p>
              </div>
            )}
          </TabsContent>

          {/* ROUTE TAB */}
          <TabsContent value="route" className="mt-5 space-y-4 animate-fade-in">
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
                label="Destination Place"
                value={form.destination}
                onChange={v => update("destination", v)}
                onCoordsChange={(lat, lng) => { update("destination_lat", lat); update("destination_lng", lng); }}
                placeholder="Select or type destination"
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
          </TabsContent>

          {/* RESOURCES TAB */}
          <TabsContent value="resources" className="mt-5 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-medium flex items-center gap-1">
                  <Car className="w-3.5 h-3.5" /> No. Of Vehicle
                  {!allowsMultipleVehicles && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5">Locked at 1</Badge>}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={allowsMultipleVehicles ? 50 : 1}
                  value={allowsMultipleVehicles ? form.num_vehicles : "1"}
                  onChange={e => update("num_vehicles", e.target.value)}
                  onBlur={e => handleBlur("num_vehicles", e.target.value, form as any)}
                  disabled={!allowsMultipleVehicles}
                  className="h-10"
                  aria-invalid={!!getError("num_vehicles")}
                />
                <FieldError field="num_vehicles" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {allowsMultipleVehicles
                    ? "Project Operations support a fleet — request as many vehicles as needed."
                    : "Daily & Field operations are limited to one vehicle. Switch to Project Operation to request more."}
                </p>
              </div>
              <div>
                <Label className="text-primary font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> No. Of Passenger</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.passengers}
                  onChange={e => update("passengers", e.target.value)}
                  onBlur={e => handleBlur("passengers", e.target.value, form as any)}
                  className="h-10"
                  aria-invalid={!!getError("passengers")}
                />
                <FieldError field="passengers" />
              </div>
              <div>
                <Label className="text-primary font-medium">Vehicle Type</Label>
                <Select value={form.vehicle_type} onValueChange={v => update("vehicle_type", v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select Vehicle Type" /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES_OPTIONS.map(vt => (
                      <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label className="text-primary font-medium">Assigned Pool</Label>
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
                <p className="text-[11px] text-muted-foreground mt-1">Operational pool the trip will be served from.</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-primary font-medium">Contact Phone (during trip)</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.contact_phone}
                  onChange={e => update("contact_phone", e.target.value)}
                  onBlur={e => handleBlur("contact_phone", e.target.value, form as any)}
                  placeholder="+251 9X XXX XXXX — reachable while the trip is active"
                  className="h-10"
                  aria-invalid={!!getError("contact_phone")}
                />
                <FieldError field="contact_phone" />
                <p className="text-[11px] text-muted-foreground mt-1">Optional. Helps dispatch reach the requester quickly if plans change.</p>
              </div>
            </div>
          </TabsContent>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-5 space-y-4 animate-fade-in">
            <div>
              <Label className="text-primary font-medium">Trip Description <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.purpose}
                onChange={e => update("purpose", e.target.value)}
                onBlur={e => handleBlur("purpose", e.target.value, form as any)}
                placeholder="Describe the purpose of this trip — what, where, and why (min 10 characters)…"
                rows={4}
                aria-invalid={!!getError("purpose")}
              />
              <FieldError field="purpose" />
              <p className="text-[11px] text-muted-foreground mt-1">
                {form.purpose?.length || 0}/2000 characters
              </p>
            </div>
            <div className="rounded-lg border border-border bg-gradient-to-br from-muted/50 to-muted/20 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Approval Routing</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">≤15 days</span> → Immediate Manager</div>
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">&gt;15 days</span> → Director</div>
                <div className="rounded-md bg-background/60 border border-border/50 p-2"><span className="font-medium text-foreground">Managers+</span> → Auto-approved</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {(() => {
        const isLast = tabIndex === TABS.length - 1;
        const FooterInner = (
          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setForm(buildInitialForm()); validation.reset(); }} className="text-muted-foreground">
              Clear
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
              {tabIndex > 0 && (
                <Button variant="outline" onClick={goPrev} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              )}
              {!isLast ? (
                <Button onClick={goNext} className="gap-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || createMutation.isPending}
                  className="gap-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
          </div>
        );
        return embedded ? (
          <div className="pt-4 border-t mt-4">{FooterInner}</div>
        ) : (
          <DialogFooter className="-mx-6 -mb-6 px-6 py-4 mt-6 bg-gradient-to-r from-muted/40 to-transparent border-t border-border/50 sm:justify-between">
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
          Fleet Requests Are Not Available
        </DialogTitle>
        <DialogDescription className="pt-2">
          Drivers cannot initiate fleet requests. Vehicle requests are filed by
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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        {isDriverOnly ? blockedBody : body}
      </DialogContent>
    </Dialog>
  );
};
