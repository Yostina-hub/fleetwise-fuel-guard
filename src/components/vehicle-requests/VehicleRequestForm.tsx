import { useState, useMemo, useEffect } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useAuth } from "@/hooks/useAuth";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Clock, Users, Car, Route, UserCog, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DateTimePicker, combineDateAndTime } from "@/components/ui/date-time-picker";
import { LocationPickerField } from "@/components/shared/LocationPickerField";
import { VEHICLE_TYPES_OPTIONS } from "@/components/fleet/formConstants";

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

const initialForm = {
  request_type: "daily_operation",
  date: undefined as Date | undefined,
  start_time: "08:00",
  end_time: "17:00",
  start_date: undefined as Date | undefined,
  start_date_time: "08:00",
  end_date: undefined as Date | undefined,
  end_date_time: "18:00",
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
};

export const VehicleRequestForm = ({ open, onOpenChange, source, embedded, prefill, onSubmitted }: VehicleRequestFormProps) => {
  const { t } = useTranslation();
  const { organizationId, isSuperAdmin } = useOrganization();
  const { user, roles: userRoles } = useAuth();
  const queryClient = useQueryClient();

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
      const user = (await supabase.auth.getUser()).data.user;
      const profile = (await supabase.from("profiles").select("full_name").eq("id", user!.id).single()).data;

      // Super admin may file on behalf of another user; otherwise use self.
      const requesterId = isSuperAdmin && onBehalfOf ? onBehalfOf.id : user!.id;
      const requesterName = isSuperAdmin && onBehalfOf
        ? onBehalfOf.name
        : (profile?.full_name || user!.email || "Unknown");
      const filedOnBehalfNote = isSuperAdmin && onBehalfOf
        ? ` (filed by ${profile?.full_name || user!.email} on behalf of ${onBehalfOf.name})`
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
        purpose: form.purpose + filedOnBehalfNote,
        needed_from: neededFrom,
        needed_until: neededUntil,
        departure_place: form.departure_place || null,
        destination: form.destination || null,
        departure_lat: form.departure_lat,
        departure_lng: form.departure_lng,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        num_vehicles: parseInt(form.num_vehicles) || 1,
        passengers: parseInt(form.passengers) || 1,
        vehicle_type: form.vehicle_type || null,
        trip_type: form.trip_type || null,
        pool_category: form.pool_category || null,
        pool_name: form.pool_name || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        project_number: form.request_type === "project_operation" ? (form.project_number || null) : null,
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
        isSuperAdmin && onBehalfOf
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

  const canSubmit = form.purpose && (isDaily ? form.date : form.start_date);

  const update = <K extends keyof typeof initialForm>(key: K, val: (typeof initialForm)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const body = (
    <>
      {!embedded && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Fleet Request Form
          </DialogTitle>
          <DialogDescription>Submit a vehicle request. Fields adapt based on operation type.</DialogDescription>
        </DialogHeader>
      )}

        {/* Draft restored notice */}
        {restoredAt && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
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
          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 flex items-center gap-2 flex-wrap">
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
                      {/* System Users */}
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
                      {/* Unlinked Drivers */}
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

        <div className="space-y-5">
          {/* Vehicle Request Type */}
          <div>
            <Label className="text-primary font-medium">Vehicle Request Type</Label>
            <Select value={form.request_type} onValueChange={v => update("request_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_operation">Daily Operation</SelectItem>
                <SelectItem value="project_operation">Project Operation</SelectItem>
                <SelectItem value="field_operation">Field Operation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time Section — dynamic per request type */}
          {isDaily ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <DateTimePicker
                  label="Date"
                  date={form.date}
                  onDateChange={d => update("date", d)}
                  required
                  minDate={new Date()}
                  hideTime
                />
              </div>
              <div>
                <Label className="text-primary font-medium">Start Time</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={e => update("start_time", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="text-primary font-medium">End Time</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={e => update("end_time", e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${isProject ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
              <DateTimePicker
                label="Start Date"
                date={form.start_date}
                onDateChange={d => update("start_date", d)}
                required
                minDate={new Date()}
                hideTime
              />
              <DateTimePicker
                label="End Date"
                date={form.end_date}
                onDateChange={d => update("end_date", d)}
                minDate={form.start_date}
                hideTime
              />
              {isProject && (
                <div>
                  <Label className="text-primary font-medium">Project Number</Label>
                  <Input
                    value={form.project_number}
                    onChange={e => update("project_number", e.target.value)}
                    placeholder="Project Number"
                  />
                </div>
              )}
            </div>
          )}

          {/* Departure & Destination from geofences/map */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Coordinates display */}
          {(form.departure_lat != null || form.destination_lat != null) && (
            <div className="grid grid-cols-2 gap-4">
              {form.departure_lat != null && form.departure_lng != null ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <div className="font-medium text-foreground text-sm">{form.departure_place || "Departure"}</div>
                  <div>Lat: {form.departure_lat.toFixed(6)} &nbsp;|&nbsp; Lng: {form.departure_lng.toFixed(6)}</div>
                </div>
              ) : <div />}
              {form.destination_lat != null && form.destination_lng != null ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <div className="font-medium text-foreground text-sm">{form.destination || "Destination"}</div>
                  <div>Lat: {form.destination_lat.toFixed(6)} &nbsp;|&nbsp; Lng: {form.destination_lng.toFixed(6)}</div>
                </div>
              ) : <div />}
            </div>
          )}

          {/* Vehicles & Passengers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Car className="w-3.5 h-3.5" /> No. Of Vehicle</Label>
              <Input type="number" min={1} value={form.num_vehicles} onChange={e => update("num_vehicles", e.target.value)} />
            </div>
            <div>
              <Label className="text-primary font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> No. Of Passenger</Label>
              <Input type="number" min={1} value={form.passengers} onChange={e => update("passengers", e.target.value)} />
            </div>
          </div>

          {/* Vehicle Type & Trip Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Vehicle Type</Label>
              <Select value={form.vehicle_type} onValueChange={v => update("vehicle_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle Type" /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES_OPTIONS.map(vt => (
                    <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          {/* Pool Category & Pool Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-primary font-medium">Pool Category</Label>
              <Select value={form.pool_category} onValueChange={v => { update("pool_category", v); update("pool_name", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select Pool Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="zone">Zone</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-primary font-medium">Pool</Label>
              <Select value={form.pool_name} onValueChange={v => update("pool_name", v)} disabled={!form.pool_category}>
                <SelectTrigger><SelectValue placeholder="Select Pool" /></SelectTrigger>
                <SelectContent>
                  {filteredPools.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip Description */}
          <div>
            <Label className="text-primary font-medium">Trip Description</Label>
            <Textarea
              value={form.purpose}
              onChange={e => update("purpose", e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </div>

          {/* Dynamic info based on type */}
          {isField && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium text-blue-400">Field Operation Note:</p>
              <p>Field operations may require special vehicle types and extended durations. Ensure GPS tracking is enabled.</p>
            </div>
          )}

          {/* Approval Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Approval Routing:</p>
            <p>• Requests ≤15 days → Routed to your Immediate Manager</p>
            <p>• Requests &gt;15 days → Routed to Director</p>
            <p>• Managers & above → Auto-approved</p>
          </div>
        </div>

      {embedded ? (
        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => { setForm(initialForm); }}>Clear</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? "Submitting..." : "Create Request"}
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => { setForm(initialForm); }}>Clear</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? "Submitting..." : "Create Request"}
            </Button>
          </div>
        </DialogFooter>
      )}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isDriverOnly ? blockedBody : body}
      </DialogContent>
    </Dialog>
  );
};
