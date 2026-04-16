import { useState, useMemo } from "react";
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

export const VehicleRequestForm = ({ open, onOpenChange }: VehicleRequestFormProps) => {
  const { t } = useTranslation();
  const { organizationId, isSuperAdmin } = useOrganization();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  // Super-admin only: file the request on behalf of another user
  const [onBehalfOf, setOnBehalfOf] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["vr-org-users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      if (error) throw error;
      return data || [];
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
    onSuccess: () => {
      toast.success("Vehicle request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel"] });
      onOpenChange(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isDaily = form.request_type === "daily_operation";
  const isProject = form.request_type === "project_operation";
  const isField = form.request_type === "field_operation";

  const canSubmit = form.purpose && (isDaily ? form.date : form.start_date);

  const update = <K extends keyof typeof initialForm>(key: K, val: (typeof initialForm)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Fleet Request Form
          </DialogTitle>
          <DialogDescription>Submit a vehicle request. Fields adapt based on operation type.</DialogDescription>
        </DialogHeader>

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

          {/* Date/Time Section */}
          {isDaily ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateTimePicker
                label="Start Date & Time"
                date={form.date}
                time={form.start_time}
                onDateChange={d => update("date", d)}
                onTimeChange={t => update("start_time", t)}
                required
                minDate={new Date()}
              />
              <DateTimePicker
                label="End Date & Time"
                date={form.end_date}
                time={form.end_time}
                onDateChange={d => update("end_date", d)}
                onTimeChange={t => update("end_time", t)}
                minDate={form.date}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateTimePicker
                label="Start Date & Time"
                date={form.start_date}
                time={form.start_date_time}
                onDateChange={d => update("start_date", d)}
                onTimeChange={t => update("start_date_time", t)}
                required
                minDate={new Date()}
              />
              <DateTimePicker
                label="End Date & Time"
                date={form.end_date}
                time={form.end_date_time}
                onDateChange={d => update("end_date", d)}
                onTimeChange={t => update("end_date_time", t)}
                minDate={form.start_date}
              />
            </div>
          )}

          {/* Project Number - only for project operations */}
          {isProject && (
            <div>
              <Label className="text-primary font-medium">Project Number</Label>
              <Input
                value={form.project_number}
                onChange={e => update("project_number", e.target.value)}
                placeholder="Enter project number (e.g. PRJ-2026-001)"
              />
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
      </DialogContent>
    </Dialog>
  );
};
